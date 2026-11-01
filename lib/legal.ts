// Dados legais do estúdio, num só sítio. Enquanto houver campos a null, a política e os
// termos mostram o aviso de texto provisório. Preencher antes do lançamento (M7).

export const LEGAL = {
  /** Nome de quem presta o serviço e trata os dados (pessoa ou empresa). */
  responsavel: null as string | null,
  morada: null as string | null,
  /** Email para pedidos sobre dados e reclamações. */
  email: "kiks1711@gmail.com" as string | null,
  /** Entidade de resolução alternativa de litígios competente para a zona do estúdio. */
  ral: null as { nome: string; url: string } | null,
  /** Idade a partir da qual se marca sem um adulto. */
  idadeMinima: null as number | null,
  /** O que acontece a quem falta sem avisar (frase completa), ou null. */
  faltas:
    "Por agora, faltar não tem penalização, mas as faltas ficam registadas na sua ficha." as
      string | null,
  atualizado: "1 de novembro de 2026",
};

export const legalCompleto = (
  ["responsavel", "morada", "email", "ral", "idadeMinima", "faltas"] as const
).every((k) => LEGAL[k] !== null);

export const aDefinir = "[a definir]";
