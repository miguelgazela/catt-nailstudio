import "server-only";

import type { MarcacaoConta } from "./conta-regras";
import { supabaseSessao } from "./supabase/sessao";

export type Ficha = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
};

/** A ficha da conta (RLS: cada pessoa só lê a sua). null = ainda não completou o perfil. */
export async function getFicha(userId: string): Promise<Ficha | null> {
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("clients")
    .select("id, name, phone, email")
    .eq("user_id", userId)
    .maybeSingle();
  return data
    ? { id: data.id, nome: data.name, telefone: data.phone, email: data.email }
    : null;
}

export async function getMarcacoes(): Promise<MarcacaoConta[]> {
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("appointments")
    .select("id, starts_at, price_cents, status, services(name)")
    .order("starts_at", { ascending: false })
    .limit(200);
  return (data ?? []).map((a) => ({
    id: a.id,
    inicio: a.starts_at,
    servico: a.services?.name ?? "Serviço",
    precoCents: a.price_cents,
    estado: a.status,
  }));
}

export async function getJanelaDeCancelamento(): Promise<number> {
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("settings")
    .select("cancel_window_hours")
    .single();
  return data?.cancel_window_hours ?? 24;
}
