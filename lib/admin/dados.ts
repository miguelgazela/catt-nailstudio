import "server-only";

import { somarDias } from "@/lib/datas";
import { supabaseSessao } from "@/lib/supabase/sessao";

import type { Folga, Marcacao, Periodo } from "./agenda";
import { lisboaParaIso } from "./tempo";

const CAMPOS =
  "id, starts_at, status, origin, note, price_cents, client:clients(id, name, phone), service:services(name)";

/** Leituras do painel: com a sessão da admin, o RLS já garante que só ela vê. */
export async function getAgenda(de: string, ate: string) {
  const sb = await supabaseSessao();
  const ini = lisboaParaIso(de, "00:00");
  const fim = lisboaParaIso(somarDias(ate, 1), "00:00");
  const [m, f, h] = await Promise.all([
    sb
      .from("appointments")
      .select(CAMPOS)
      .gte("starts_at", ini)
      .lt("starts_at", fim)
      .order("starts_at"),
    sb
      .from("time_off")
      .select("id, starts_at, ends_at, reason")
      .lt("starts_at", fim)
      .gt("ends_at", ini)
      .order("starts_at"),
    sb
      .from("weekly_hours")
      .select("weekday, start_time, end_time")
      .order("start_time"),
  ]);
  return {
    marcacoes: (m.data ?? []) as unknown as Marcacao[],
    folgas: (f.data ?? []) as Folga[],
    periodos: (h.data ?? []) as Periodo[],
  };
}

export async function getMarcacao(id: string): Promise<Marcacao | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("appointments")
    .select(CAMPOS)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as Marcacao) ?? null;
}

export async function getAuditoria(entidade: string, id: string) {
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("audit_log")
    .select("at, actor, action, details")
    .eq("entity", entidade)
    .eq("entity_id", id)
    .order("at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getServicosAtivos() {
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("services")
    .select("id, name, price_cents")
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
}
