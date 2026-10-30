import Link from "next/link";

import { Logo } from "./logo";

const ligacao =
  "inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline";

export function Rodape() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <Logo size={32} className="rounded-lg" />
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            Catarina Neves Nails Studio
            <br />
            Pagamento no estúdio
          </p>
        </div>
        <nav aria-label="Informação legal" className="flex flex-wrap gap-x-5">
          <Link href="/privacidade" className={ligacao}>
            Privacidade
          </Link>
          <Link href="/termos" className={ligacao}>
            Termos
          </Link>
          <a
            href="https://www.livroreclamacoes.pt/"
            target="_blank"
            rel="noopener noreferrer"
            className={ligacao}
          >
            Livro de Reclamações
          </a>
        </nav>
      </div>
    </footer>
  );
}
