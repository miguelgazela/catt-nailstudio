import { NextResponse } from "next/server";

import { caminhoSeguro } from "@/lib/caminho";
import { COOKIE_PAINEL } from "@/lib/sessao-painel";
import { supabaseSessao } from "@/lib/supabase/sessao";

export const dynamic = "force-dynamic";

// O painel fechou por tempo: termina a sessão e pede um novo link.
export async function GET(pedido: Request) {
  const url = new URL(pedido.url);
  const destino = caminhoSeguro(url.searchParams.get("next"));
  const sb = await supabaseSessao();
  await sb.auth.signOut();
  const r = NextResponse.redirect(
    new URL(
      `/entrar?erro=sessao&next=${encodeURIComponent(destino)}`,
      url.origin,
    ),
  );
  r.cookies.delete(COOKIE_PAINEL);
  return r;
}
