import Link from "next/link";

import { Cabecalho } from "@/components/marca/cabecalho";
import { Rodape } from "@/components/marca/rodape";
import { diaPorExtenso, emLisboa, intervalo } from "@/lib/datas";
import { getDefinicoes } from "@/lib/dados";
import { carregarPorToken } from "@/lib/email/marcacao";

import { cancelarMarcacao } from "./actions";

export const metadata = {
  title: "Cancelar marcação | Catarina Neves Nails Studio",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function Cancelar({
  params,
  searchParams,
}: PageProps<"/cancelar/[token]">) {
  const { token } = await params;
  const { erro } = await searchParams;
  const m = /^[0-9a-f]{64}$/.test(token) ? await carregarPorToken(token) : null;
  const def = await getDefinicoes();
  const telefone = def.contact_phone;

  if (!m || m.estado !== "confirmed") {
    return (
      <>
        <Cabecalho />
        <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-4 pb-10">
          <h1 className="font-display text-[32px] leading-9 font-semibold">
            Este link já não é válido
          </h1>
          <p className="text-base leading-6 text-muted-foreground">
            A marcação pode já ter sido cancelada ou já passou.
            {telefone ? ` Se precisar de ajuda, ligue para ${telefone}.` : ""}
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

  const { dia, hora } = emLisboa(m.marcacao.inicio);
  const tarde = erro === "tarde";
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-5 pt-4 pb-10">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Cancelar marcação
        </h1>
        <dl className="tabular m-0 rounded-lg border border-border bg-card px-4 py-1">
          {(
            [
              ["Serviço", m.marcacao.servico],
              ["Dia", diaPorExtenso(dia)],
              ["Hora", intervalo(hora)],
            ] as const
          ).map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-4 border-b border-border py-3 text-[15px] leading-[22px] last:border-b-0"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="m-0 text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        {tarde ? (
          <p
            role="alert"
            className="rounded-lg bg-danger-surface px-4 py-3 text-sm leading-5 text-danger"
          >
            Só é possível cancelar até 24 h antes.
            {telefone ? ` Ligue para ${telefone}.` : " Contacte o estúdio."}
          </p>
        ) : (
          <p className="text-sm leading-5 text-muted-foreground">
            Pode cancelar até 24 h antes. A hora fica livre para outra pessoa.
          </p>
        )}

        <form action={cancelarMarcacao} className="flex flex-col gap-2">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-danger-surface text-base font-bold text-danger transition-colors hover:bg-danger-surface/70"
          >
            Cancelar marcação
          </button>
          <Link
            href="/"
            className="inline-flex h-12 w-full items-center justify-center rounded-full text-base font-bold text-primary no-underline hover:bg-accent"
          >
            Manter a marcação
          </Link>
        </form>
      </main>
      <Rodape />
    </>
  );
}
