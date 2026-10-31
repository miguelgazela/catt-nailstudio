import { redirect } from "next/navigation";

import { Cabecalho } from "@/components/marca/cabecalho";
import { Rodape } from "@/components/marca/rodape";
import { getUtilizador } from "@/lib/auth";
import { caminhoSeguro } from "@/lib/caminho";

import { FormEntrar } from "./form-entrar";

export const metadata = {
  title: "Entrar ou criar conta | Catarina Neves Nails Studio",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { next, erro } = await searchParams;
  const destino = caminhoSeguro(typeof next === "string" ? next : null);
  // O painel não cria contas: aí o ecrã diz só "Entrar".
  const painel = /^\/admin(\/|\?|$)/.test(destino);
  if (await getUtilizador()) redirect(destino);

  return (
    <>
      <Cabecalho semEntrar />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-5 pt-4 pb-10">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          {painel ? "Entrar" : "Entrar ou criar conta"}
        </h1>
        {erro === "link" ? (
          <p
            role="alert"
            className="rounded-lg bg-danger-surface px-4 py-3 text-sm leading-5 text-danger"
          >
            Este link já não é válido. Peça um novo.
          </p>
        ) : null}
        <FormEntrar
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
          destino={destino}
          criarConta={!painel}
        />
      </main>
      <Rodape />
    </>
  );
}
