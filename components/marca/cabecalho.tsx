import Link from "next/link";

import { LinkConta } from "./link-conta";
import { Logo } from "./logo";

/**
 * "Entrar" (ou "A minha conta", se há sessão) leva a /conta: sem sessão vai para /entrar e volta; cliente vê as marcações;
 * admin é mandada para o painel. Sem ler a sessão aqui, as páginas estáticas continuam estáticas.
 * Nas páginas da conta mostra "Início". Na app instalada não há barra de endereço, por isso este é o caminho para entrar.
 */
export function Cabecalho({ semEntrar = false }: { semEntrar?: boolean }) {
  return (
    <header className="mx-auto flex h-16 w-full max-w-xl items-center justify-between gap-3 px-5">
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2.5 text-foreground no-underline"
      >
        <Logo size={36} />
        <span className="font-display text-[21px] font-semibold">
          Catarina Neves
        </span>
      </Link>
      {semEntrar ? (
        <Link
          href="/"
          className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
        >
          Início
        </Link>
      ) : (
        <LinkConta />
      )}
    </header>
  );
}
