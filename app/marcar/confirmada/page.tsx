import { CalendarClock, CalendarPlus, Check } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Rodape } from "@/components/marca/rodape";
import { linkGoogleCalendar } from "@/lib/calendario";
import { diaPorExtenso, emLisboa, intervalo, precoEmEuros } from "@/lib/datas";
import { getDefinicoes } from "@/lib/dados";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = {
  title: "Marcação confirmada | Catarina Neves Nails Studio",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function Confirmada({
  searchParams,
}: PageProps<"/marcar/confirmada">) {
  const { id, e } = await searchParams;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) notFound();

  // O id (uuid aleatório) é a prova de que a marcação é desta pessoa. Não mostramos dados pessoais.
  const { data } = await supabaseAdmin()
    .from("appointments")
    .select("starts_at, price_cents, status, services(name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const def = await getDefinicoes();
  const { dia, hora } = emLisboa(data.starts_at);
  const linhas: [string, string][] = [
    ["Serviço", data.services?.name ?? ""],
    ["Dia", diaPorExtenso(dia)],
    ["Hora", intervalo(hora)],
    ["Preço", `${precoEmEuros(data.price_cents)}, paga no estúdio`],
  ];
  if (def.address) linhas.push(["Onde", def.address]);

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-5 pt-10 pb-10">
        <div className="flex flex-col gap-3">
          <span className="flex size-16 items-center justify-center rounded-full bg-success-surface text-success">
            <Check aria-hidden className="size-[30px]" strokeWidth={2.25} />
          </span>
          <h1 className="font-display text-[32px] leading-9 font-semibold">
            Marcação confirmada
          </h1>
          <p className="text-base leading-6 text-muted-foreground">
            {e === "1"
              ? "A tua hora está reservada. Enviámos os detalhes para o teu email."
              : "A tua hora está reservada. Guarda a data no calendário ou tire uma captura deste ecrã."}
          </p>
        </div>

        <dl className="tabular m-0 rounded-lg border border-border bg-card px-4 py-1">
          {linhas.map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-4 border-b border-border py-3 text-[15px] leading-[22px] last:border-b-0"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="m-0 text-right font-semibold whitespace-pre-line">
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-2">
          <a
            href={`/marcar/confirmada/calendario?id=${id}`}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground no-underline transition-colors hover:bg-primary-pressed"
          >
            <CalendarPlus aria-hidden className="size-[18px]" />
            Adicionar ao calendário
          </a>
          <a
            href={linkGoogleCalendar({
              id,
              inicio: new Date(data.starts_at),
              titulo: `${data.services?.name ?? "Marcação"}, Catarina Neves Nails Studio`,
              descricao: "Pagamento no estúdio. Podes cancelar até 24 h antes.",
              local: def.address,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-input bg-card text-base font-bold text-foreground no-underline transition-colors hover:bg-accent"
          >
            Abrir no Google Calendar
          </a>
        </div>

        <p className="flex items-start gap-2.5 text-sm leading-5 text-muted-foreground">
          <CalendarClock aria-hidden className="mt-0.5 size-[18px] shrink-0" />
          <span>
            Podes cancelar até 24 h antes
            {def.contact_phone ? (
              <>
                , ligando para o estúdio:{" "}
                <span className="tabular font-semibold text-foreground">
                  {def.contact_phone}
                </span>
              </>
            ) : (
              ", contactando o estúdio"
            )}
            .
          </span>
        </p>

        <Link
          href="/"
          className="inline-flex h-12 w-full items-center justify-center rounded-full text-base font-bold text-primary no-underline hover:bg-accent"
        >
          Voltar ao início
        </Link>
      </main>
      <Rodape />
    </>
  );
}
