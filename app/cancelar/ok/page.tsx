import { Check } from "lucide-react";
import Link from "next/link";

import { Rodape } from "@/components/marca/rodape";

export const metadata = {
  title: "Marcação cancelada | Catarina Neves Nails Studio",
  robots: { index: false },
};

export default function Cancelada() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-10 pb-10">
        <span className="flex size-16 items-center justify-center rounded-full bg-success-surface text-success">
          <Check aria-hidden className="size-[30px]" strokeWidth={2.25} />
        </span>
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Marcação cancelada
        </h1>
        <p className="text-base leading-6 text-muted-foreground">
          A hora ficou livre. Quando quiseres, podes marcar outra.
        </p>
        <Link
          href="/marcar"
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground no-underline hover:bg-primary-pressed"
        >
          Marcar outra hora
        </Link>
      </main>
      <Rodape />
    </>
  );
}
