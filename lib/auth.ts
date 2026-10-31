import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { COOKIE_PAINEL, lerCookiePainel } from "./sessao-painel";
import { supabaseSessao } from "./supabase/sessao";

export { caminhoSeguro } from "./caminho";

export type Utilizador = { id: string; email: string | null };

// Uma só leitura da sessão por pedido: o layout e a página chamam isto várias vezes, e cada
// cliente novo voltava a verificar o token (e a ir buscar as chaves públicas ao Supabase).
const lerClaims = cache(async () => {
  const sb = await supabaseSessao();
  const { data } = await sb.auth.getClaims();
  return data?.claims ?? null;
});

export async function getUtilizador(): Promise<Utilizador | null> {
  const c = await lerClaims();
  if (!c?.sub) return null;
  return { id: c.sub, email: typeof c.email === "string" ? c.email : null };
}

/** Páginas só para quem entrou. Quem não entrou vai para /entrar e volta depois. */
export async function exigirUtilizador(destino: string): Promise<Utilizador> {
  const u = await getUtilizador();
  if (!u) redirect(`/entrar?next=${encodeURIComponent(destino)}`);
  return u;
}

/** Área de cliente (/conta). Admin não é cliente: vai para o painel. */
export async function exigirCliente(destino: string): Promise<Utilizador> {
  const u = await exigirUtilizador(destino);
  if (await eAdmin()) redirect("/admin");
  return u;
}

/** A pessoa está na tabela `admins`? (o RLS deixa cada admin ler só a própria linha) */
export const eAdmin = cache(async (): Promise<boolean> => {
  const u = await getUtilizador();
  if (!u) return false;
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("admins")
    .select("user_id")
    .eq("user_id", u.id)
    .maybeSingle();
  return Boolean(data);
});

/**
 * Páginas do painel. Quem não entrou vai para /entrar; quem entrou mas não é admin
 * vê 404 (não revelamos que o painel existe). Admin sem o segundo passo (código da
 * app autenticadora, nível aal2) vai para /admin/mfa; e o painel fecha depois de
 * 3 dias parado ou 7 dias no total (ver lib/sessao-painel.ts).
 */
export async function exigirAdmin(destino = "/admin"): Promise<Utilizador> {
  const u = await exigirUtilizador(destino);
  if (!(await eAdmin())) notFound();
  if ((await lerClaims())?.aal !== "aal2") {
    redirect(`/admin/mfa?next=${encodeURIComponent(destino)}`);
  }
  const sessao = lerCookiePainel((await cookies()).get(COOKIE_PAINEL)?.value);
  if (!sessao || sessao.utilizador !== u.id) {
    redirect(`/admin/expirou?next=${encodeURIComponent(destino)}`);
  }
  return u;
}

/** Para as páginas de MFA: tem de ser admin, mas ainda não precisa do segundo passo. */
export async function exigirAdminSemMfa(destino: string): Promise<Utilizador> {
  const u = await exigirUtilizador(destino);
  if (!(await eAdmin())) notFound();
  return u;
}
