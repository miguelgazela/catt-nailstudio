"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// Cookie da sessão (sb-…-auth-token, por vezes em pedaços .0/.1). Não é httpOnly: serve só
// para escolher o texto do link; quem protege /conta é o servidor.
const temSessao = () => /(?:^|;\s*)sb-[^=]*-auth-token/.test(document.cookie);
const nunca = () => () => {};

export function LinkConta() {
  // No servidor (e na hidratação) assume sem sessão; no cliente lê o cookie.
  const entrou = useSyncExternalStore(nunca, temSessao, () => false);
  return (
    <Link
      href="/conta"
      className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
    >
      {entrou ? "A minha conta" : "Entrar"}
    </Link>
  );
}
