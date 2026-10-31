import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Renova a sessão (cookies) nas áreas com login. As páginas públicas não passam por aqui.
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
  resposta.headers.set("Cache-Control", "private, no-store");
  return resposta;
}

export const config = {
  matcher: ["/conta/:path*", "/admin/:path*", "/entrar", "/auth/:path*"],
};
