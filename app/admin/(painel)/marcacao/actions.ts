"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { type Estado, horasDoHorario, linhasDoDia } from "@/lib/admin/agenda";
import { getAgenda } from "@/lib/admin/dados";
import { DIA_RE, HORA_RE, lisboaParaIso } from "@/lib/admin/tempo";
import { exigirAdmin } from "@/lib/auth";
import { supabaseSessao } from "@/lib/supabase/sessao";
import { normalizarTelemovel } from "@/lib/telemovel";

const UUID = z.string().uuid();
export type EstadoForm = { erro?: string; campos?: Record<string, string> };

export type HoraDoDia = {
  hora: string;
  estado: "livre" | "ocupada" | "bloqueada";
};

/** Horas do horário nesse dia e se estão livres (para escolher a hora ao marcar ou mover). */
export async function horasDoDia(
  dia: string,
  excluirId?: string,
): Promise<HoraDoDia[]> {
  await exigirAdmin("/admin");
  if (!DIA_RE.test(dia)) return [];
  const { marcacoes, folgas, periodos } = await getAgenda(dia, dia);
  const outras = marcacoes.filter((m) => m.id !== excluirId);
  const linhas = linhasDoDia(dia, periodos, outras, folgas);
  return horasDoHorario(dia, periodos).map((hora) => {
    const l = linhas.find((x) => x.hora === hora);
    return {
      hora,
      estado:
        !l || l.tipo === "marcacao"
          ? "ocupada"
          : l.tipo === "folga"
            ? "bloqueada"
            : "livre",
    };
  });
}

async function mudarEstado(
  id: string,
  de: Estado[],
  dados: { status: Estado },
  depois: string,
) {
  await exigirAdmin("/admin");
  if (!UUID.safeParse(id).success) redirect("/admin");
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("appointments")
    .update(dados)
    .eq("id", id)
    .in("status", de)
    .select("id, starts_at")
    .maybeSingle();
  revalidatePath("/admin", "layout");
  redirect(data ? depois : `/admin/marcacao/${id}?erro=estado`);
}

export async function cancelarMarcacao(dados: FormData) {
  const id = String(dados.get("id") ?? "");
  await exigirAdmin("/admin");
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_by: "admin",
      cancelled_at: new Date().toISOString(),
      cancel_token_hash: null,
    })
    .eq("id", id)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (!data) redirect(`/admin/marcacao/${id}?erro=estado`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/marcacao/${id}?feito=cancelada`);
}

export async function marcarFalta(dados: FormData) {
  const id = String(dados.get("id") ?? "");
  await mudarEstado(
    id,
    ["confirmed"],
    { status: "no_show" },
    `/admin/marcacao/${id}?feito=falta`,
  );
}

export async function marcarConcluida(dados: FormData) {
  const id = String(dados.get("id") ?? "");
  await mudarEstado(
    id,
    ["confirmed"],
    { status: "done" },
    `/admin/marcacao/${id}?feito=concluida`,
  );
}

export async function reabrirMarcacao(dados: FormData) {
  const id = String(dados.get("id") ?? "");
  await mudarEstado(
    id,
    ["no_show", "done"],
    { status: "confirmed" },
    `/admin/marcacao/${id}?feito=reaberta`,
  );
}

const campoHora = z.object({
  dia: z.string().regex(DIA_RE, "Escolha o dia."),
  hora: z.string().optional(),
  horaLivre: z.string().optional(),
  fora: z.string().optional(),
});

/** Valida o dia e a hora escolhidos e devolve o início em UTC. */
async function resolverInicio(
  bruto: Record<string, FormDataEntryValue | null>,
): Promise<
  { inicio: string } | { erro: string; campos?: Record<string, string> }
> {
  const p = campoHora.safeParse({
    dia: String(bruto.dia ?? ""),
    hora: String(bruto.hora ?? ""),
    horaLivre: String(bruto.horaLivre ?? ""),
    fora: bruto.fora ? "1" : undefined,
  });
  if (!p.success)
    return { erro: "Escolha o dia.", campos: { dia: "Escolha o dia." } };
  const { dia, hora, horaLivre, fora } = p.data;
  const h = fora ? horaLivre : hora;
  if (!h || !HORA_RE.test(h)) {
    return {
      erro: fora ? "Escreva a hora." : "Escolha uma hora.",
      campos: { hora: fora ? "Escreva a hora." : "Escolha uma hora." },
    };
  }
  if (!fora) {
    const { periodos } = await getAgenda(dia, dia);
    if (!horasDoHorario(dia, periodos).includes(h)) {
      return {
        erro: "Essa hora não está no horário. Use “Fora do horário”.",
        campos: { hora: "Hora fora do horário." },
      };
    }
  }
  return { inicio: lisboaParaIso(dia, h) };
}

const OCUPADA = "Essa hora já está ocupada por outra marcação.";

export async function moverMarcacao(
  _a: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  await exigirAdmin("/admin");
  const id = String(dados.get("id") ?? "");
  if (!UUID.safeParse(id).success) return { erro: "Marcação inválida." };
  const r = await resolverInicio({
    dia: dados.get("dia"),
    hora: dados.get("hora"),
    horaLivre: dados.get("horaLivre"),
    fora: dados.get("fora"),
  });
  if ("erro" in r) return r;
  const sb = await supabaseSessao();
  const fim = new Date(Date.parse(r.inicio) + 3600_000).toISOString();
  const { data, error } = await sb
    .from("appointments")
    .update({ starts_at: r.inicio, ends_at: fim })
    .eq("id", id)
    .eq("status", "confirmed")
    .select("id")
    .maybeSingle();
  if (error?.code === "23P01") return { erro: OCUPADA };
  if (error || !data)
    return {
      erro: "Não foi possível mover. Só se movem marcações confirmadas.",
    };
  revalidatePath("/admin", "layout");
  redirect(`/admin/marcacao/${id}?feito=movida`);
}

const nova = z.object({
  nome: z.string().trim().max(100),
  tel: z.string().trim(),
  email: z.string().trim().max(254),
  servico: UUID,
  nota: z.string().trim().max(500),
  cliente: z.string().optional(),
});
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function criarMarcacao(
  _a: EstadoForm,
  dados: FormData,
): Promise<EstadoForm> {
  await exigirAdmin("/admin");
  const bruto = Object.fromEntries(dados.entries());
  const p = nova.safeParse(bruto);
  if (!p.success) {
    return {
      erro: "Escolha o serviço.",
      campos: { servico: "Escolha o serviço." },
    };
  }
  const d = p.data;
  const sb = await supabaseSessao();

  // Cliente: ficha existente (vinda da ficha ou pelo telemóvel) ou nova.
  let clienteId: string | null = null;
  if (d.cliente && UUID.safeParse(d.cliente).success) {
    const { data } = await sb
      .from("clients")
      .select("id")
      .eq("id", d.cliente)
      .is("anonymized_at", null)
      .maybeSingle();
    clienteId = data?.id ?? null;
  }
  if (!clienteId) {
    const campos: Record<string, string> = {};
    if (!d.nome) campos.nome = "Escreva o nome.";
    const tel = d.tel ? normalizarTelemovel(d.tel) : null;
    if (!tel)
      campos.tel = "Número inválido. Escreva os 9 números do telemóvel.";
    if (d.email && !EMAIL.test(d.email)) campos.email = "Email inválido.";
    if (Object.keys(campos).length)
      return { erro: "Veja os campos assinalados.", campos };
    const { data: existe } = await sb
      .from("clients")
      .select("id")
      .eq("phone", tel!)
      .maybeSingle();
    if (existe) {
      clienteId = existe.id;
    } else {
      const { data: criada, error } = await sb
        .from("clients")
        .insert({ name: d.nome, phone: tel, email: d.email || null })
        .select("id")
        .single();
      if (error || !criada)
        return { erro: "Não foi possível guardar a cliente." };
      clienteId = criada.id;
    }
  }

  const r = await resolverInicio({
    dia: dados.get("dia"),
    hora: dados.get("hora"),
    horaLivre: dados.get("horaLivre"),
    fora: dados.get("fora"),
  });
  if ("erro" in r) return r;

  const { data: servico } = await sb
    .from("services")
    .select("id, price_cents")
    .eq("id", d.servico)
    .maybeSingle();
  if (!servico)
    return {
      erro: "Serviço inválido.",
      campos: { servico: "Escolha o serviço." },
    };

  const { data, error } = await sb
    .from("appointments")
    .insert({
      client_id: clienteId,
      service_id: servico.id,
      starts_at: r.inicio,
      ends_at: new Date(Date.parse(r.inicio) + 3600_000).toISOString(),
      status: "confirmed",
      origin: "admin",
      price_cents: servico.price_cents,
      note: d.nota || null,
    })
    .select("id")
    .single();
  if (error?.code === "23P01") return { erro: OCUPADA };
  if (error || !data) return { erro: "Não foi possível guardar a marcação." };
  revalidatePath("/admin", "layout");
  redirect(`/admin/marcacao/${data.id}?feito=criada`);
}
