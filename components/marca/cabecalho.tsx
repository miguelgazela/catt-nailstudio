import Link from "next/link";

import { Logo } from "./logo";

export function Cabecalho() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-xl items-center px-5">
      <Link
        href="/"
        className="flex min-h-11 items-center gap-2.5 text-foreground no-underline"
      >
        <Logo size={36} />
        <span className="font-display text-[21px] font-semibold">
          Catarina Neves
        </span>
      </Link>
    </header>
  );
}
