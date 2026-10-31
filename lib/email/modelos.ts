import { gerarIcs, linkGoogleCalendar } from "../calendario";
import {
  diaPorExtenso,
  diaPorExtensoMinusculas,
  emLisboa,
  intervalo,
  precoEmEuros,
} from "../datas";

export type DadosMarcacao = {
  id: string;
  servico: string;
  inicio: Date;
  precoCents: number;
  morada?: string | null;
  telefone?: string | null;
  siteUrl: string;
  /** Só convidadas com email têm token; quem tem conta cancela na conta. */
  tokenCancelar?: string | null;
};

export type EmailPronto = {
  assunto: string;
  html: string;
  texto: string;
  anexos?: { nome: string; conteudo: string; tipo: string }[];
};

const COR = {
  fundo: "#F7F1EC",
  texto: "#2E1F26",
  suave: "#6B5A60",
  ameixa: "#7A3B52",
  borda: "#E6D9D1",
  cartao: "#FFFFFF",
};
const SERIFA = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Manrope, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

const esc = (t: string) =>
  t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type Botao = { texto: string; href: string; principal?: boolean };

function html(opts: {
  prehead: string;
  titulo: string;
  intro: string;
  linhas: [string, string][];
  botoes: Botao[];
  nota?: string;
  motivo?: string;
  siteUrl: string;
}): string {
  const linhas = opts.linhas
    .map(
      ([k, v], i) => `
        <tr>
          <td style="padding:12px 0;${i ? `border-top:1px solid ${COR.borda};` : ""}font:400 15px/22px ${SANS};color:${COR.suave};width:96px;vertical-align:top">${esc(k)}</td>
          <td style="padding:12px 0;${i ? `border-top:1px solid ${COR.borda};` : ""}font:600 15px/22px ${SANS};color:${COR.texto};text-align:right">${esc(v).replace(/\n/g, "<br>")}</td>
        </tr>`,
    )
    .join("");
  const botoes = opts.botoes
    .map((b) =>
      b.principal
        ? `<a href="${esc(b.href)}" style="display:inline-block;background:${COR.ameixa};color:#FFFFFF;font:700 16px/20px ${SANS};text-decoration:none;padding:14px 26px;border-radius:999px;margin:0 8px 8px 0">${esc(b.texto)}</a>`
        : `<a href="${esc(b.href)}" style="display:inline-block;color:${COR.ameixa};font:600 15px/20px ${SANS};text-decoration:underline;padding:14px 8px;margin:0 8px 8px 0">${esc(b.texto)}</a>`,
    )
    .join("");
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(opts.titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${COR.fundo};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.prehead)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.fundo}">
  <tr><td align="center" style="padding:28px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
      <tr><td style="padding:0 4px 20px">
        <img src="${esc(opts.siteUrl)}/logo-cn-384.png" width="48" height="48" alt="Catarina Neves Nails Studio" style="display:block;border:0;border-radius:10px">
      </td></tr>
      <tr><td style="background:${COR.cartao};border:1px solid ${COR.borda};border-radius:16px;padding:28px 24px">
        <h1 style="margin:0 0 10px;font:600 32px/36px ${SERIFA};color:${COR.texto}">${esc(opts.titulo)}</h1>
        <p style="margin:0 0 20px;font:400 16px/24px ${SANS};color:${COR.suave}">${esc(opts.intro)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">${linhas}</table>
        <div>${botoes}</div>
        ${opts.nota ? `<p style="margin:16px 0 0;font:400 14px/20px ${SANS};color:${COR.suave}">${esc(opts.nota)}</p>` : ""}
      </td></tr>
      <tr><td style="padding:20px 4px 0;font:400 13px/18px ${SANS};color:${COR.suave}">
        Catarina Neves Nails Studio. Pagamento no estúdio.<br>
        Recebeu este email porque ${esc(opts.motivo ?? "fez uma marcação")}. Usamos os seus dados só para a gerir e não enviamos publicidade.
        <a href="${esc(opts.siteUrl)}/privacidade" style="color:${COR.ameixa}">Como tratamos os seus dados</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function resumo(d: DadosMarcacao): [string, string][] {
  const { dia, hora } = emLisboa(d.inicio);
  const l: [string, string][] = [
    ["Serviço", d.servico],
    ["Dia", diaPorExtenso(dia)],
    ["Hora", intervalo(hora)],
    ["Preço", `${precoEmEuros(d.precoCents)}, paga no estúdio`],
  ];
  if (d.morada) l.push(["Onde", d.morada]);
  return l;
}

function textoLinhas(linhas: [string, string][]): string {
  return linhas.map(([k, v]) => `${k}: ${v.replace(/\n/g, ", ")}`).join("\n");
}

function evento(d: DadosMarcacao) {
  return {
    id: d.id,
    inicio: d.inicio,
    titulo: `${d.servico}, Catarina Neves Nails Studio`,
    descricao: "Pagamento no estúdio. Pode cancelar até 24 h antes.",
    local: d.morada,
  };
}

const quando = (d: DadosMarcacao) => {
  const { dia, hora } = emLisboa(d.inicio);
  return `${diaPorExtensoMinusculas(dia)}, ${hora}`;
};

function contacto(d: DadosMarcacao) {
  return d.telefone ? ` ou ligue para ${d.telefone}` : "";
}

export function emailConfirmacao(
  d: DadosMarcacao,
  agora: Date = new Date(),
): EmailPronto {
  // O lembrete só sai a quem marca com mais de 49 h de antecedência (ver lib/lembretes.ts).
  const haLembrete = d.inicio.getTime() - agora.getTime() > 49 * 3600_000;
  const cancelar = d.tokenCancelar
    ? `${d.siteUrl}/cancelar/${d.tokenCancelar}`
    : null;
  const linhas = resumo(d);
  const google = linkGoogleCalendar(evento(d));
  const botoes: Botao[] = [
    { texto: "Adicionar ao Google Calendar", href: google, principal: true },
  ];
  if (cancelar) botoes.push({ texto: "Cancelar marcação", href: cancelar });
  const nota = cancelar
    ? `Pode cancelar até 24 h antes. Depois disso, contacte o estúdio${contacto(d)}. O ficheiro em anexo funciona com qualquer calendário.`
    : `Para cancelar, contacte o estúdio${contacto(d)}. O ficheiro em anexo funciona com qualquer calendário.`;
  return {
    assunto: `Marcação confirmada: ${quando(d)}`,
    html: html({
      prehead: `${d.servico}, ${quando(d)}`,
      titulo: "Marcação confirmada",
      intro: haLembrete
        ? "A sua hora está reservada. Enviamos-lhe um lembrete dois dias antes."
        : "A sua hora está reservada.",
      linhas,
      botoes,
      nota,
      siteUrl: d.siteUrl,
    }),
    texto: [
      "Marcação confirmada",
      "",
      textoLinhas(linhas),
      "",
      `Adicionar ao Google Calendar: ${google}`,
      ...(cancelar ? [`Cancelar marcação: ${cancelar}`] : []),
      "",
      nota,
    ].join("\n"),
    anexos: [
      {
        nome: "marcacao.ics",
        conteudo: gerarIcs(evento(d)),
        tipo: "text/calendar; charset=utf-8; method=PUBLISH",
      },
    ],
  };
}

export function emailLembrete(d: DadosMarcacao): EmailPronto {
  const linhas = resumo(d);
  const limite = emLisboa(new Date(d.inicio.getTime() - 24 * 3600_000));
  const nota = `Se não puder vir, cancele até ${diaPorExtensoMinusculas(limite.dia)}, ${limite.hora} (24 h antes), pelo link do email de confirmação${contacto(d)}.`;
  return {
    assunto: `Lembrete: ${quando(d)}`,
    html: html({
      prehead: `${d.servico}, ${quando(d)}`,
      titulo: "Até já",
      intro: "Lembramos que tem uma marcação daqui a dois dias.",
      linhas,
      botoes: [
        {
          texto: "Adicionar ao Google Calendar",
          href: linkGoogleCalendar(evento(d)),
          principal: true,
        },
      ],
      nota,
      siteUrl: d.siteUrl,
    }),
    texto: ["Até já", "", textoLinhas(linhas), "", nota].join("\n"),
  };
}

/** Link para entrar (sem palavra-passe). Válido 1 hora. */
export function emailEntrada(d: {
  link: string;
  siteUrl: string;
}): EmailPronto {
  const nota =
    "O link serve uma vez e expira numa hora. Se não pediu para entrar, ignore este email: ninguém entra sem ele.";
  return {
    assunto: "O seu link para entrar",
    html: html({
      prehead: "Carregue no botão para entrar.",
      titulo: "Entrar",
      intro:
        "Carregue no botão para entrar na sua conta. Não precisa de palavra-passe.",
      linhas: [],
      botoes: [{ texto: "Entrar", href: d.link, principal: true }],
      nota,
      motivo: "pediu para entrar na sua conta",
      siteUrl: d.siteUrl,
    }),
    texto: [
      "Entrar",
      "",
      `Abra este link para entrar: ${d.link}`,
      "",
      nota,
    ].join("\n"),
  };
}
