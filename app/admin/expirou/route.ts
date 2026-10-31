import { NextResponse } from "next/server";

import { caminhoSeguro } from "@/lib/caminho";
import { COOKIE_PAINEL } from "@/lib/sessao-painel";

export const dynamic = "force-dynamic";

// O painel fechou por tempo. A sessão (login por email) mantém-se: basta o código da app.
export async function GET(pedido: Request) {
  const url = new URL(pedido.url);
  const destino = caminhoSeguro(url.searchParams.get("next"));
  const r = NextResponse.redirect(
    new URL(
      `/admin/mfa?expirou=1&next=${encodeURIComponent(destino)}`,
      url.origin,
    ),
  );
  r.cookies.delete(COOKIE_PAINEL);
  return r;
}
