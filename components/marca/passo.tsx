import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function Passo({ n, voltar }: { n: 1 | 2 | 3; voltar: string }) {
  return (
    <header className="mx-auto flex w-full max-w-xl flex-col gap-2 pt-2 pr-5 pl-2">
      <div className="flex items-center gap-1">
        <Link
          href={voltar}
          aria-label="Voltar"
          className="inline-flex size-11 items-center justify-center rounded-full text-foreground"
        >
          <ChevronLeft aria-hidden className="size-[22px]" strokeWidth={2} />
        </Link>
        <span className="text-sm text-muted-foreground">Passo {n} de 4</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={n}
        aria-label="Progresso da marcação"
        className="flex gap-1.5 pl-3"
      >
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= n ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
    </header>
  );
}
