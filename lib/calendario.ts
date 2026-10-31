// .ics e link do Google Calendar. As datas viajam em UTC; o calendário converte para a hora local.

type Evento = {
  id: string;
  inicio: Date;
  titulo: string;
  descricao?: string;
  local?: string | null;
  agora?: Date;
};

const UTC = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const HORA = 60 * 60 * 1000;

function escapar(t: string): string {
  return t
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Linhas com mais de 75 bytes continuam na seguinte, com um espaço à frente (RFC 5545).
function dobrar(linha: string): string {
  const bytes = new TextEncoder().encode(linha);
  if (bytes.length <= 75) return linha;
  const partes: string[] = [];
  let atual = "";
  let tamanho = 0;
  for (const c of linha) {
    const n = new TextEncoder().encode(c).length;
    if (tamanho + n > (partes.length ? 74 : 75)) {
      partes.push(atual);
      atual = "";
      tamanho = 0;
    }
    atual += c;
    tamanho += n;
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

export function gerarIcs(e: Evento): string {
  const fim = new Date(e.inicio.getTime() + HORA);
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Catarina Neves Nails Studio//Marcacoes//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@catarinaneves-nails`,
    `DTSTAMP:${UTC(e.agora ?? new Date())}`,
    `DTSTART:${UTC(e.inicio)}`,
    `DTEND:${UTC(fim)}`,
    `SUMMARY:${escapar(e.titulo)}`,
    ...(e.local ? [`LOCATION:${escapar(e.local)}`] : []),
    ...(e.descricao ? [`DESCRIPTION:${escapar(e.descricao)}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}

export function linkGoogleCalendar(e: Evento): string {
  const fim = new Date(e.inicio.getTime() + HORA);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.titulo,
    dates: `${UTC(e.inicio)}/${UTC(fim)}`,
  });
  if (e.descricao) p.set("details", e.descricao);
  if (e.local) p.set("location", e.local);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
