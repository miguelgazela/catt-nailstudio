import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const alvo =
  "inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground no-underline hover:bg-accent";

export function NavegarDia({
  base,
  anterior,
  seguinte,
  hoje,
  titulo,
  sub,
}: {
  base: string;
  anterior: string;
  seguinte: string;
  hoje: string;
  titulo: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href={`${base}?dia=${anterior}`}
        aria-label="Anterior"
        className={alvo}
      >
        <ChevronLeft aria-hidden className="size-5" />
      </Link>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-base font-bold">{titulo}</p>
        {sub ? (
          <p className="text-[13px] text-muted-foreground">{sub}</p>
        ) : null}
      </div>
      <Link
        href={`${base}?dia=${hoje}`}
        className={cn(alvo, "w-auto px-4 text-sm font-semibold")}
      >
        Hoje
      </Link>
      <Link
        href={`${base}?dia=${seguinte}`}
        aria-label="Seguinte"
        className={alvo}
      >
        <ChevronRight aria-hidden className="size-5" />
      </Link>
    </div>
  );
}
