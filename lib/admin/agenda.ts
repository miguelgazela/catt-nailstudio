// Lógica pura da agenda (sem acesso a dados), para testar.
import { diaDaSemana, emLisboa } from "../datas";

import { lisboaParaIso } from "./tempo";

export type Estado = "confirmed" | "cancelled" | "no_show" | "done";

export type Marcacao = {
  id: string;
  starts_at: string;
  status: Estado;
  origin: "online" | "admin";
  note: string | null;
  price_cents: number;
  client: { id: string; name: string; phone: string | null } | null;
  service: { name: string } | null;
};

export type Periodo = { weekday: number; start_time: string; end_time: string };
export type Folga = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type Linha =
  | { tipo: "marcacao"; hora: string; m: Marcacao }
  | { tipo: "livre"; hora: string }
  | { tipo: "folga"; hora: string; motivo: string | null };

const hhmm = (t: string) => t.slice(0, 5);
const minutos = (h: string) =>
  Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const texto = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Horas de início do dia: cada período em fatias de 60 min a contar do início (como na BD). */
export function horasDoHorario(dia: string, periodos: Periodo[]): string[] {
  const wd = diaDaSemana(dia) + 1;
  const horas = new Set<string>();
  for (const p of periodos) {
    if (p.weekday !== wd) continue;
    for (
      let m = minutos(p.start_time);
      m + 60 <= minutos(p.end_time);
      m += 60
    ) {
      horas.add(texto(m));
    }
  }
  return [...horas].sort();
}

export function folgaNaHora(
  dia: string,
  hora: string,
  folgas: Folga[],
): Folga | null {
  const ini = Date.parse(lisboaParaIso(dia, hora));
  const fim = ini + 3600_000;
  return (
    folgas.find(
      (f) => Date.parse(f.starts_at) < fim && Date.parse(f.ends_at) > ini,
    ) ?? null
  );
}

/**
 * Linhas do dia por ordem: marcações ativas (mesmo fora do horário), horas livres do
 * horário e bloqueios. Uma hora do horário com marcação não aparece como livre.
 */
export function linhasDoDia(
  dia: string,
  periodos: Periodo[],
  marcacoes: Marcacao[],
  folgas: Folga[],
): Linha[] {
  const ativas = marcacoes.filter((m) => m.status !== "cancelled");
  const linhas: Linha[] = [];
  const ocupadas = new Set<string>();
  for (const m of ativas) {
    const { dia: d, hora } = emLisboa(m.starts_at);
    if (d !== dia) continue;
    linhas.push({ tipo: "marcacao", hora, m });
    ocupadas.add(hora);
  }
  for (const hora of horasDoHorario(dia, periodos)) {
    if (ocupadas.has(hora)) continue;
    // Uma marcação fora da grelha (ex.: 10:30) também ocupa a hora vizinha.
    const ini = minutos(hora);
    const choca = ativas.some((m) => {
      const e = emLisboa(m.starts_at);
      if (e.dia !== dia) return false;
      const mi = minutos(e.hora);
      return mi < ini + 60 && mi + 60 > ini;
    });
    if (choca) continue;
    const f = folgaNaHora(dia, hora, folgas);
    linhas.push(
      f ? { tipo: "folga", hora, motivo: f.reason } : { tipo: "livre", hora },
    );
  }
  return linhas.sort((a, b) => a.hora.localeCompare(b.hora));
}

export { hhmm };
