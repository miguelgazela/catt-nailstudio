"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { eAdmin, getUtilizador } from "@/lib/auth";
import { emLisboa } from "@/lib/datas";
import { carregarPorId, enviarConfirmacao } from "@/lib/email/marcacao";
import { permitido, verificarTurnstile } from "@/lib/seguranca";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabasePublico } from "@/lib/supabase/public";
import { normalizarTelemovel } from "@/lib/telemovel";

export type EstadoForm = {
  erro?: string;
  campos?: { nome?: string; tel?: string; email?: string };
  valores?: { nome: string; tel: string; email: string };
};

const dados = z.object({
  servico: z.string().uuid(),
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string().regex(/^\d{2}:\d{2}$/),
  nome: z
    .string()
    .trim()
    .min(1, "Escreve o teu nome.")
    .max(100, "O nome é demasiado longo."),
  tel: z.string().trim().min(1, "Escreve o teu telemóvel."),
  email: z.string().trim().max(254, "O email é demasiado longo."),
  token: z.string(),
});

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const MENSAGEM_GERAL =
  "Não foi possível concluir. Tenta outra vez dentro de instantes.";

export async function reservar(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const bruto = {
    servico: String(formData.get("servico") ?? ""),
    dia: String(formData.get("dia") ?? ""),
    hora: String(formData.get("hora") ?? ""),
    nome: String(formData.get("nome") ?? ""),
    tel: String(formData.get("tel") ?? ""),
    email: String(formData.get("email") ?? ""),
    token: String(formData.get("cf-turnstile-response") ?? ""),
  };
  const valores = { nome: bruto.nome, tel: bruto.tel, email: bruto.email };

  const lido = dados.safeParse(bruto);
  if (!lido.success) {
    const campos: NonNullable<EstadoForm["campos"]> = {};
    for (const i of lido.error.issues) {
      const k = i.path[0];
      if ((k === "nome" || k === "tel" || k === "email") && !campos[k]) {
        campos[k] = i.message;
      }
    }
    return Object.keys(campos).length
      ? { campos, valores }
      : { erro: MENSAGEM_GERAL, valores };
  }
  const d = lido.data;

  const campos: NonNullable<EstadoForm["campos"]> = {};
  const telefone = normalizarTelemovel(d.tel);
  if (!telefone)
    campos.tel = "Número inválido. Escreve os 9 números do telemóvel.";
  if (d.email && !EMAIL.test(d.email))
    campos.email = "Email inválido. Confirma se tens o @ e o domínio.";
  if (Object.keys(campos).length) return { campos, valores };

  const h = await headers();
  const ip =
    h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (!(await verificarTurnstile(d.token, ip))) {
    return {
      erro: "Não conseguimos confirmar que és uma pessoa. Tenta outra vez.",
      valores,
    };
  }
  const limiteOk =
    (await permitido(`ip:${ip ?? "?"}`, 10, 600)) &&
    (await permitido(`tel:${telefone}`, 5, 600)) &&
    // O email recebe a confirmação: sem este limite, dava para encher a caixa de alguém.
    (!d.email ||
      (await permitido(`marcar-email:${d.email.toLowerCase()}`, 3, 3600)));
  if (!limiteOk) {
    return {
      erro: "Fizeste demasiados pedidos. Espera uns minutos e tenta outra vez.",
      valores,
    };
  }

  return concluir({
    servico: d.servico,
    dia: d.dia,
    hora: d.hora,
    nome: d.nome,
    telefone: telefone!,
    email: d.email || undefined,
    valores,
  });
}

type Pedido = {
  servico: string;
  dia: string;
  hora: string;
  nome: string;
  telefone: string;
  email?: string;
  userId?: string;
  valores: NonNullable<EstadoForm["valores"]>;
};

/** Reserva a hora e reage a cada resposta da BD. Partilhado pela marcação sem conta e com conta. */
async function concluir(d: Pedido): Promise<EstadoForm> {
  const { valores } = d;
  // Encontra a hora exata (instante) a partir do dia e da hora de Lisboa.
  const { data: vagas } = await supabasePublico().rpc("available_slots", {
    p_from: d.dia,
    p_to: d.dia,
  });
  const vaga = (vagas ?? []).find((v) => {
    const l = emLisboa(v.starts_at);
    return l.dia === d.dia && l.hora === d.hora;
  });
  const voltar = `/marcar?servico=${d.servico}&dia=${d.dia}&erro=ocupada`;
  if (!vaga) redirect(voltar);

  const { data, error } = await supabaseAdmin().rpc("book_appointment", {
    p_service: d.servico,
    p_starts_at: vaga.starts_at,
    p_name: d.nome,
    p_phone: d.telefone,
    p_email: d.email,
    p_user_id: d.userId,
  });
  const r = data as {
    ok?: boolean;
    error?: string;
    appointment_id?: string;
    cancel_token?: string | null;
  } | null;
  if (error || !r) return { erro: MENSAGEM_GERAL, valores };

  if (r.ok && r.appointment_id) {
    const id = r.appointment_id;
    // Emails depois da resposta: se falharem, a marcação mantém-se.
    after(async () => {
      const m = await carregarPorId(id, r.cancel_token);
      if (m) await enviarConfirmacao(m);
    });
    const comEmail = d.email && process.env.RESEND_API_KEY ? "&e=1" : "";
    redirect(`/marcar/confirmada?id=${id}${comEmail}`);
  }
  switch (r.error) {
    case "slot_taken":
    case "outside_window":
      redirect(voltar);
    case "blocked":
      return {
        erro: "Este número não pode fazer marcações online. Contacta o estúdio.",
        valores,
      };
    case "guest_limit":
      return {
        erro: "Já tens uma marcação futura com este número. Para marcar outra, contacta o estúdio.",
        valores,
      };
    case "phone_in_use":
      return {
        erro: "Não conseguimos usar este número. Contacta o estúdio.",
        valores,
      };
    case "invalid_phone":
      return {
        campos: { tel: "Número inválido. Escreve os 9 números do telemóvel." },
        valores,
      };
    default:
      return { erro: MENSAGEM_GERAL, valores };
  }
}

export type EstadoConta = {
  erro?: string;
  campos?: { nome?: string; tel?: string };
};

/** Marcar com conta: a identidade vem da sessão (já passou pelo Turnstile ao entrar), por isso só há limite por conta. */
export async function reservarComConta(
  _anterior: EstadoConta,
  formData: FormData,
): Promise<EstadoConta> {
  const u = await getUtilizador();
  const servico = String(formData.get("servico") ?? "");
  const dia = String(formData.get("dia") ?? "");
  const hora = String(formData.get("hora") ?? "");
  if (!u)
    redirect(
      `/entrar?next=${encodeURIComponent(`/marcar?servico=${servico}&dia=${dia}&hora=${hora}&modo=conta`)}`,
    );
  if (await eAdmin()) {
    return { erro: 'No painel use "Nova marcação" para marcar.' };
  }
  if (
    !z.string().uuid().safeParse(servico).success ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dia) ||
    !/^\d{2}:\d{2}$/.test(hora)
  ) {
    return { erro: MENSAGEM_GERAL };
  }

  // Quem já tem ficha marca com os dados dela; quem ainda não tem preenche aqui.
  const { data: ficha } = await supabaseAdmin()
    .from("clients")
    .select("name, phone")
    .eq("user_id", u.id)
    .maybeSingle();
  const nome = ficha?.name ?? String(formData.get("nome") ?? "").trim();
  const bruto = ficha?.phone ?? String(formData.get("tel") ?? "");
  const campos: NonNullable<EstadoConta["campos"]> = {};
  if (!nome || nome.length > 100) campos.nome = "Escreve o teu nome.";
  const telefone = normalizarTelemovel(bruto);
  if (!telefone)
    campos.tel = "Número inválido. Escreve os 9 números do telemóvel.";
  if (Object.keys(campos).length) return { campos };

  if (!(await permitido(`marcar-conta:${u.id}`, 10, 600))) {
    return {
      erro: "Fizeste demasiados pedidos. Espera uns minutos e tenta outra vez.",
    };
  }

  const r = await concluir({
    servico,
    dia,
    hora,
    nome,
    telefone: telefone!,
    email: u.email ?? undefined,
    userId: u.id,
    valores: { nome, tel: bruto, email: u.email ?? "" },
  });
  return { erro: r.erro, campos: r.campos };
}
