"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { emLisboa } from "@/lib/datas";
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
    .min(1, "Escreva o seu nome.")
    .max(100, "O nome é demasiado longo."),
  tel: z.string().trim().min(1, "Escreva o seu telemóvel."),
  email: z.string().trim().max(254, "O email é demasiado longo."),
  token: z.string(),
});

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const MENSAGEM_GERAL =
  "Não foi possível concluir. Tente outra vez dentro de instantes.";

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
    campos.tel = "Número inválido. Escreva os 9 números do telemóvel.";
  if (d.email && !EMAIL.test(d.email))
    campos.email = "Email inválido. Confirme se tem o @ e o domínio.";
  if (Object.keys(campos).length) return { campos, valores };

  const h = await headers();
  const ip =
    h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (!(await verificarTurnstile(d.token, ip))) {
    return {
      erro: "Não conseguimos confirmar que é uma pessoa. Tente outra vez.",
      valores,
    };
  }
  const limiteOk =
    (await permitido(`ip:${ip ?? "?"}`, 10, 600)) &&
    (await permitido(`tel:${telefone}`, 5, 600));
  if (!limiteOk) {
    return {
      erro: "Fez demasiados pedidos. Espere uns minutos e tente outra vez.",
      valores,
    };
  }

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
    p_phone: telefone!,
    p_email: d.email || undefined,
  });
  const r = data as {
    ok?: boolean;
    error?: string;
    appointment_id?: string;
  } | null;
  if (error || !r) return { erro: MENSAGEM_GERAL, valores };

  if (r.ok && r.appointment_id) {
    redirect(`/marcar/confirmada?id=${r.appointment_id}`);
  }
  switch (r.error) {
    case "slot_taken":
    case "outside_window":
      redirect(voltar);
    case "blocked":
      return {
        erro: "Este número não pode fazer marcações online. Contacte o estúdio.",
        valores,
      };
    case "guest_limit":
      return {
        erro: "Já tem uma marcação futura com este número. Para marcar outra, contacte o estúdio.",
        valores,
      };
    case "invalid_phone":
      return {
        campos: { tel: "Número inválido. Escreva os 9 números do telemóvel." },
        valores,
      };
    default:
      return { erro: MENSAGEM_GERAL, valores };
  }
}
