type Evento = { type: "pageview" | "event"; url: string };

/**
 * Limpa cada visita antes de ir para o Vercel Web Analytics: nunca vão tokens (link de
 * cancelar) nem parâmetros (links do email). O painel e as rotas de login não contam,
 * para não misturar as visitas da Catarina com as das clientes.
 */
export function limparEvento<E extends Evento>(e: E): E | null {
  const u = new URL(e.url);
  if (/^\/(admin|auth|abrir)(\/|$)/.test(u.pathname)) return null;
  const caminho = u.pathname.replace(
    /^\/cancelar\/(?!ok$)[^/]+/,
    "/cancelar/[token]",
  );
  return { ...e, url: `${u.origin}${caminho}` };
}
