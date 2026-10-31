import { emLisboa } from "../datas";

/** "2026-11-02" + "09:00" (hora de Lisboa) -> instante ISO em UTC. */
export function lisboaParaIso(dia: string, hora: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const [h, mi] = hora.split(":").map(Number);
  const alvo = Date.UTC(a, m - 1, d, h, mi);
  let t = alvo;
  for (let i = 0; i < 2; i++) {
    const l = emLisboa(new Date(t));
    const [la, lm, ld] = l.dia.split("-").map(Number);
    const [lh, lmi] = l.hora.split(":").map(Number);
    t -= Date.UTC(la, lm - 1, ld, lh, lmi) - alvo;
  }
  return new Date(t).toISOString();
}

export const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;
export const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function diaValido(dia: string | null | undefined): dia is string {
  if (!dia || !DIA_RE.test(dia)) return false;
  const [a, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  return (
    t.getUTCFullYear() === a &&
    t.getUTCMonth() === m - 1 &&
    t.getUTCDate() === d
  );
}

/** Segunda-feira da semana do dia. */
export function segundaDe(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d));
  const dow = (t.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(a, m - 1, d - dow)).toISOString().slice(0, 10);
}
