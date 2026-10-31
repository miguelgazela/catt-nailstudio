import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import {
  COOKIE_PAINEL,
  criarCookiePainel,
  lerCookiePainel,
  opcoesCookiePainel,
} from "@/lib/sessao-painel";

// Renova a sessão (cookies) nas áreas com login e em /marcar (separador "Com conta"). As páginas públicas não passam por aqui.
export async function proxy(pedido: NextRequest) {
  let resposta = NextResponse.next({ request: pedido });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => pedido.cookies.getAll(),
        setAll(lista) {
          for (const { name, value } of lista) pedido.cookies.set(name, value);
          resposta = NextResponse.next({ request: pedido });
          for (const { name, value, options } of lista) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );
  await supabase.auth.getClaims();

  // Painel: mantém a sessão viva enquanto a Catarina o usa (no máximo 1 escrita por minuto).
  if (pedido.nextUrl.pathname.startsWith("/admin")) {
    const sessao = lerCookiePainel(pedido.cookies.get(COOKIE_PAINEL)?.value);
    if (sessao && Date.now() - sessao.ultimo > 60_000) {
      resposta.cookies.set(
        COOKIE_PAINEL,
        criarCookiePainel(sessao.utilizador, sessao.inicio),
        opcoesCookiePainel,
      );
    }
  }
  resposta.headers.set("Cache-Control", "private, no-store");
  return resposta;
}

export const config = {
  matcher: [
    "/conta/:path*",
    "/admin/:path*",
    "/entrar",
    "/auth/:path*",
    "/marcar",
  ],
};
