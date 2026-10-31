import Link from "next/link";

import { Cabecalho } from "@/components/marca/cabecalho";
import { Rodape } from "@/components/marca/rodape";

export const metadata = {
  title: "Conta apagada | Catarina Neves Nails Studio",
  robots: { index: false },
};

export default function Apagada() {
  return (
    <>
      <Cabecalho semEntrar />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-4 pb-10">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Conta apagada
        </h1>
        <p className="text-base leading-6 text-muted-foreground">
          Cancelámos as suas marcações futuras e apagámos os seus dados. Será
          sempre bem-vinda para marcar outra vez.
        </p>
        <Link
          href="/"
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground no-underline hover:bg-primary-pressed"
        >
          Voltar ao início
        </Link>
      </main>
      <Rodape />
    </>
  );
}
