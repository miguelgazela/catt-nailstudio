import "server-only";

import { emLisboa, hojeEmLisboa, somarDias } from "./datas";
import { supabasePublico } from "./supabase/public";

export type Servico = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
};

export type Definicoes = {
  max_advance_days: number;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  instagram: string | null;
};

export type Vaga = { dia: string; hora: string };

export async function getServicos(): Promise<Servico[]> {
  const { data } = await supabasePublico()
    .from("services")
    .select("id, name, description, price_cents")
    .eq("active", true)
    .order("sort_order");
  return data ?? [];
}

export async function getServico(id: string): Promise<Servico | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabasePublico()
    .from("services")
    .select("id, name, description, price_cents")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  return data;
}

export async function getDefinicoes(): Promise<Definicoes> {
  const { data } = await supabasePublico()
    .from("settings")
    .select(
      "max_advance_days, contact_phone, contact_email, address, instagram",
    )
    .single();
  return (
    data ?? {
      max_advance_days: 42,
      contact_phone: null,
      contact_email: null,
      address: null,
      instagram: null,
    }
  );
}

/** Horas livres entre duas datas de Lisboa (inclusive), já em hora de Lisboa. */
export async function getVagas(de: string, ate: string): Promise<Vaga[]> {
  const { data } = await supabasePublico().rpc("available_slots", {
    p_from: de,
    p_to: ate,
  });
  return (data ?? []).map((v) => emLisboa(v.starts_at));
}

export async function getVagasDaJanela(maxDias: number): Promise<Vaga[]> {
  const hoje = hojeEmLisboa();
  return getVagas(hoje, somarDias(hoje, maxDias));
}

const NOMES_DIAS = [
  "Segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
];

/** Linhas de horário a mostrar, a partir de weekly_hours: "Segunda a sexta, 9:00 às 12:00 e 14:30 às 18:30". */
export async function getHorario(): Promise<string[]> {
  const { data } = await supabasePublico()
    .from("weekly_hours")
    .select("weekday, start_time, end_time")
    .order("weekday")
    .order("start_time");
  const hm = (t: string) => t.slice(0, 5).replace(/^0/, "");
  const porDia = new Map<number, string>();
  for (const r of data ?? []) {
    const p = `${hm(r.start_time)} às ${hm(r.end_time)}`;
    porDia.set(
      r.weekday,
      porDia.has(r.weekday) ? `${porDia.get(r.weekday)} e ${p}` : p,
    );
  }
  const grupos: { de: number; ate: number; horas: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    const horas = porDia.get(d);
    if (!horas) continue;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.ate === d - 1 && ultimo.horas === horas)
      ultimo.ate = d;
    else grupos.push({ de: d, ate: d, horas });
  }
  const nome = (d: number, primeiro: boolean) => {
    const n = NOMES_DIAS[d - 1];
    return primeiro ? n.charAt(0).toUpperCase() + n.slice(1) : n;
  };
  return grupos.map((g) => {
    const dias =
      g.de === g.ate
        ? nome(g.de, true)
        : g.ate === g.de + 1
          ? `${nome(g.de, true)} e ${nome(g.ate, false)}`
          : `${nome(g.de, true)} a ${nome(g.ate, false)}`;
    return `${dias}, ${g.horas}`;
  });
}
