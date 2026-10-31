import { type NextRequest, NextResponse } from "next/server";

import { eAdmin } from "@/lib/auth";

// start_url da app instalada: a Catarina abre direto no painel, as clientes na página inicial.
export const dynamic = "force-dynamic";

export async function GET(pedido: NextRequest) {
  const destino = (await eAdmin()) ? "/admin" : "/";
  return NextResponse.redirect(new URL(destino, pedido.url));
}
