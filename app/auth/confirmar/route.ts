import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { caminhoSeguro } from "@/lib/caminho";
import { supabaseSessao } from "@/lib/supabase/sessao";

export const dynamic = "force-dynamic";

const TIPOS: EmailOtpType[] = ["magiclink", "email", "signup"];

// O link do email traz token_hash: funciona em qualquer browser (não depende de um cookie
// guardado no sítio onde se pediu o link, ao contrário do fluxo PKCE).
export async function GET(pedido: Request) {
  const url = new URL(pedido.url);
  const token_hash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const destino = caminhoSeguro(url.searchParams.get("next"));

  if (token_hash && tipo && TIPOS.includes(tipo)) {
    const sb = await supabaseSessao();
    const { error } = await sb.auth.verifyOtp({ type: tipo, token_hash });
    if (!error) return NextResponse.redirect(new URL(destino, url.origin));
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", url.origin));
}
