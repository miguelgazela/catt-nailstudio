import { CalendarOff, Plus } from "lucide-react";
import Link from "next/link";

import { EstadoMarcacao } from "@/components/admin/estado-marcacao";
import { NavegarDia } from "@/components/admin/navegar-dia";
import { exigirAdmin } from "@/lib/auth";
import {
  diaPorExtenso,
  hojeEmLisboa,
  precoEmEuros,
  somarDias,
} from "@/lib/datas";
import { linhasDoDia } from "@/lib/admin/agenda";
import { getAgenda } from "@/lib/admin/dados";
import { diaValido } from "@/lib/admin/tempo";
import { buttonVariants } from "@/components/ui/button";
import { emLisboa } from "@/lib/datas";

export default async function Agenda({ searchParams }: PageProps<"/admin">) {
  const { dia: pedido } = await searchParams;
  const hoje = hojeEmLisboa();
  const dia = diaValido(typeof pedido === "string" ? pedido : null)
    ? (pedido as string)
    : hoje;
  await exigirAdmin(`/admin?dia=${dia}`);

  const { marcacoes, folgas, periodos } = await getAgenda(dia, dia);
  const linhas = linhasDoDia(dia, periodos, marcacoes, folgas);
  const canceladas = marcacoes.filter((m) => m.status === "cancelled");
  const ativas = marcacoes.filter((m) => m.status !== "cancelled").length;

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Agenda
        </h1>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-11 items-center rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground">
            Dia
          </span>
          <Link
            href={`/admin/semana?dia=${dia}`}
            className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-semibold no-underline hover:bg-accent"
          >
            Semana
          </Link>
        </div>
      </div>

      <NavegarDia
        base="/admin"
        anterior={somarDias(dia, -1)}
        seguinte={somarDias(dia, 1)}
        hoje={hoje}
        titulo={diaPorExtenso(dia)}
        sub={
          ativas === 0
            ? "Sem marcações"
            : ativas === 1
              ? "1 marcação"
              : `${ativas} marcações`
        }
      />

      {linhas.length === 0 ? (
        <p className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-5 text-base text-muted-foreground">
          <CalendarOff aria-hidden className="size-5" />
          Dia sem horário de abertura.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {linhas.map((l) => (
            <li
              key={`${l.tipo}-${l.hora}`}
              className="flex items-stretch gap-3"
            >
              <span className="tabular w-12 shrink-0 pt-3.5 text-sm font-bold">
                {l.hora}
              </span>
              {l.tipo === "marcacao" ? (
                <Link
                  href={`/admin/marcacao/${l.m.id}`}
                  className="flex min-h-14 flex-1 flex-col gap-1.5 rounded-lg border border-border bg-card px-4 py-3 no-underline shadow-card"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-bold text-foreground">
                      {l.m.client?.name ?? "Cliente"}
                    </span>
                    <EstadoMarcacao estado={l.m.status} />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {l.m.service?.name} · {precoEmEuros(l.m.price_cents)}
                    {l.m.origin === "admin" ? " · marcada por si" : ""}
                  </span>
                </Link>
              ) : l.tipo === "folga" ? (
                <div className="flex min-h-14 flex-1 items-center rounded-lg bg-muted px-4 text-sm text-muted-foreground">
                  Bloqueada{l.motivo ? `: ${l.motivo}` : ""}
                </div>
              ) : (
                <Link
                  href={`/admin/nova?dia=${dia}&hora=${l.hora}`}
                  className="flex min-h-14 flex-1 items-center gap-2 rounded-lg border border-dashed border-input px-4 text-sm font-semibold text-primary no-underline hover:bg-accent"
                >
                  <Plus aria-hidden className="size-4" /> Livre · marcar
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {canceladas.length ? (
        <section aria-labelledby="canc" className="flex flex-col gap-2">
          <h2 id="canc" className="text-sm font-bold text-muted-foreground">
            Canceladas
          </h2>
          <ul className="flex flex-col gap-2">
            {canceladas.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/admin/marcacao/${m.id}`}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-muted px-4 text-sm text-muted-foreground no-underline"
                >
                  <span>
                    {emLisboa(m.starts_at).hora} · {m.client?.name}
                  </span>
                  <EstadoMarcacao estado="cancelled" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link
        href={`/admin/nova?dia=${dia}`}
        className={buttonVariants({ className: "no-underline" })}
      >
        <Plus aria-hidden /> Nova marcação
      </Link>
    </main>
  );
}
