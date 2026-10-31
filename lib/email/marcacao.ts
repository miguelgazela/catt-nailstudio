import "server-only";

import { createHash } from "node:crypto";

import { supabaseAdmin } from "../supabase/admin";
import { enviarEmail } from "./enviar";
import { type DadosMarcacao, emailConfirmacao, emailLembrete } from "./modelos";

export const urlDoSite = () =>
  (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type MarcacaoCompleta = {
  marcacao: DadosMarcacao;
  estado: string;
  cliente: { nome: string; telefone: string | null; email: string | null };
};

const SELECT =
  "id, starts_at, price_cents, status, services(name), clients(name, phone, email)";

type Linha = {
  id: string;
  starts_at: string;
  price_cents: number;
  status: string;
  services: { name: string } | null;
  clients: { name: string; phone: string | null; email: string | null } | null;
};

async function montar(
  l: Linha,
  tokenCancelar?: string | null,
): Promise<MarcacaoCompleta> {
  const { data: s } = await supabaseAdmin()
    .from("settings")
    .select("contact_phone, address")
    .single();
  return {
    marcacao: {
      id: l.id,
      servico: l.services?.name ?? "",
      inicio: new Date(l.starts_at),
      precoCents: l.price_cents,
      morada: s?.address,
      telefone: s?.contact_phone,
      siteUrl: urlDoSite(),
      tokenCancelar,
    },
    estado: l.status,
    cliente: {
      nome: l.clients?.name ?? "",
      telefone: l.clients?.phone ?? null,
      email: l.clients?.email ?? null,
    },
  };
}

export async function carregarPorId(
  id: string,
  tokenCancelar?: string | null,
): Promise<MarcacaoCompleta | null> {
  const { data } = await supabaseAdmin()
    .from("appointments")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  return data ? montar(data as unknown as Linha, tokenCancelar) : null;
}

export async function carregarPorToken(
  token: string,
): Promise<MarcacaoCompleta | null> {
  const hash = createHash("sha256").update(token).digest("hex");
  const { data } = await supabaseAdmin()
    .from("appointments")
    .select(SELECT)
    .eq("cancel_token_hash", hash)
    .maybeSingle();
  return data ? montar(data as unknown as Linha, token) : null;
}

/** Confirmação à cliente (se deixou email). Nunca lança. A Catarina não recebe email: ver notificações push (M4). */
export async function enviarConfirmacao(m: MarcacaoCompleta): Promise<void> {
  try {
    if (m.cliente.email) {
      const e = emailConfirmacao(m.marcacao);
      await enviarEmail({ para: m.cliente.email, ...e, anexos: e.anexos });
    }
  } catch {
    console.error("Falha ao enviar o email da marcação");
  }
}

export async function enviarLembrete(m: MarcacaoCompleta): Promise<boolean> {
  if (!m.cliente.email) return false;
  const e = emailLembrete({ ...m.marcacao, tokenCancelar: null });
  return enviarEmail({ para: m.cliente.email, ...e });
}
