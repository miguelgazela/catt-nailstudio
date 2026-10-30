// Tudo em hora de Lisboa. As datas viajam como "YYYY-MM-DD" e as horas como "HH:MM".
const TZ = "Europe/Lisbon";

const DIAS = [
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
];
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const partes = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function emLisboa(instante: Date | string): {
  dia: string;
  hora: string;
} {
  const p = Object.fromEntries(
    partes.formatToParts(new Date(instante)).map((x) => [x.type, x.value]),
  );
  return {
    dia: `${p.year}-${p.month}-${p.day}`,
    hora: `${p.hour}:${p.minute}`,
  };
}

export function hojeEmLisboa(): string {
  return emLisboa(new Date()).dia;
}

/** Dia da semana com segunda = 0 ... domingo = 6. */
export function diaDaSemana(dia: string): number {
  const [a, m, d] = dia.split("-").map(Number);
  return (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
}

export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}

export function mesDoDia(dia: string): string {
  return dia.slice(0, 7);
}

export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sexta, 13 de novembro" */
export function diaPorExtenso(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${maiuscula(DIAS[diaDaSemana(dia)])}, ${d} de ${MESES[m - 1]}`;
}

/** "sexta, 13 de novembro" (meio de frase) */
export function diaPorExtensoMinusculas(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${DIAS[diaDaSemana(dia)]}, ${d} de ${MESES[m - 1]}`;
}

/** "10:00" -> "10:00 às 11:00" (marcações de 1 hora) */
export function intervalo(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  return `${hora} às ${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function precoEmEuros(cents: number): string {
  const euros = cents / 100;
  return Number.isInteger(euros)
    ? `${euros} €`
    : `${euros.toFixed(2).replace(".", ",")} €`;
}
