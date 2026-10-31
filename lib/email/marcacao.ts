import "server-only";

import { createHash } from "node:crypto";

import { supabaseAdmin } from "../supabase/admin";
import { enviarEmail } from "./enviar";
import {
  type DadosMarcacao,
  emailAvisoEstudio,
  emailCancelamento,
  emailConfirmacao,
  emailLembrete,
} from "./modelos";

export const urlDoSite = () =>
  (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type MarcacaoCompleta = {
  marcacao: DadosMarcacao;
  estado: string;
  cliente: { nome: string; telefone: string | null; email: string | null };
  estudio: { email: string | null; avisar: boolean };
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
    .select("contact_phone, contact_email, address, notify_on_booking")
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
    estudio: {
      email: s?.contact_email ?? null,
      avisar: s?.notify_on_booking ?? false,
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

/** Confirmação à cliente (se deixou email) e aviso à Catarina (se ativo e com email). Nunca lança. */
export async function enviarConfirmacao(m: MarcacaoCompleta): Promise<void> {
  try {
    if (m.cliente.email) {
      const e = emailConfirmacao(m.marcacao);
      await enviarEmail({ para: m.cliente.email, ...e, anexos: e.anexos });
    }
    if (m.estudio.avisar && m.estudio.email && m.cliente.telefone) {
      const e = emailAvisoEstudio(m.marcacao, "nova", {
        nome: m.cliente.nome,
        telefone: m.cliente.telefone,
      });
      await enviarEmail({ para: m.estudio.email, ...e });
    }
  } catch {
    console.error("Falha ao enviar emails da marcação");
  }
}

export async function enviarCancelamento(m: MarcacaoCompleta): Promise<void> {
  try {
    if (m.cliente.email) {
      const e = emailCancelamento({ ...m.marcacao, tokenCancelar: null });
      await enviarEmail({ para: m.cliente.email, ...e });
    }
    if (m.estudio.avisar && m.estudio.email && m.cliente.telefone) {
      const e = emailAvisoEstudio(m.marcacao, "cancelada", {
        nome: m.cliente.nome,
        telefone: m.cliente.telefone,
      });
      await enviarEmail({ para: m.estudio.email, ...e });
    }
  } catch {
    console.error("Falha ao enviar emails do cancelamento");
  }
}

export async function enviarLembrete(m: MarcacaoCompleta): Promise<boolean> {
  if (!m.cliente.email) return false;
  const e = emailLembrete({ ...m.marcacao, tokenCancelar: null });
  return enviarEmail({ para: m.cliente.email, ...e });
}
