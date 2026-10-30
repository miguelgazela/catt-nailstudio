/** Devolve o número em E.164 ou null se for inválido. Aceita "912 345 678", "+351 912 345 678", "00351...". */
export function normalizarTelemovel(bruto: string): string | null {
  let n = bruto.replace(/[\s.\-()]/g, "");
  if (n.startsWith("00")) n = `+${n.slice(2)}`;
  if (/^\d{9}$/.test(n)) n = `+351${n}`;
  if (n.startsWith("+351")) return /^\+351[239]\d{8}$/.test(n) ? n : null;
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : null;
}
