import Link from "next/link";

import { EstadoMarcacao } from "@/components/admin/estado-marcacao";
import { NavegarDia } from "@/components/admin/navegar-dia";
import { linhasDoDia, type Linha } from "@/lib/admin/agenda";
import { getAgenda } from "@/lib/admin/dados";
import { diaValido, segundaDe } from "@/lib/admin/tempo";
import { exigirAdmin } from "@/lib/auth";
import { diaPorExtenso, hojeEmLisboa, somarDias } from "@/lib/datas";

const CURTO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default async function Semana({
  searchParams,
}: PageProps<"/admin/semana">) {
  const { dia: pedido } = await searchParams;
  const hoje = hojeEmLisboa();
  const base = diaValido(typeof pedido === "string" ? pedido : null)
    ? (pedido as string)
    : hoje;
  const segunda = segundaDe(base);
  await exigirAdmin(`/admin/semana?dia=${base}`);

  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const { marcacoes, folgas, periodos } = await getAgenda(dias[0], dias[6]);
  const porDia = dias.map((d) => ({
    dia: d,
    linhas: linhasDoDia(d, periodos, marcacoes, folgas),
  }));
  const total = marcacoes.filter((m) => m.status !== "cancelled").length;
  const horas = [
    ...new Set(porDia.flatMap((p) => p.linhas.map((l) => l.hora))),
  ].sort();

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Agenda
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin?dia=${base}`}
            className="inline-flex h-11 items-center rounded-full border border-border px-4 text-sm font-semibold no-underline hover:bg-accent"
          >
            Dia
          </Link>
          <span className="inline-flex h-11 items-center rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground">
            Semana
          </span>
        </div>
      </div>
      <NavegarDia
        base="/admin/semana"
        anterior={somarDias(segunda, -7)}
        seguinte={somarDias(segunda, 7)}
        hoje={hoje}
        titulo={`${diaPorExtenso(dias[0]).split(", ")[1]} a ${diaPorExtenso(dias[6]).split(", ")[1]}`}
        sub={total === 1 ? "1 marcação" : `${total} marcações`}
      />

      {/* Telemóvel: um cartão por dia */}
      <div className="flex flex-col gap-3 md:hidden">
        {porDia.map(({ dia, linhas }) => {
          const marcadas = linhas.filter(
            (l): l is Extract<Linha, { tipo: "marcacao" }> =>
              l.tipo === "marcacao",
          );
          return (
            <section
              key={dia}
              className="rounded-lg border border-border bg-card shadow-card"
            >
              <Link
                href={`/admin?dia=${dia}`}
                className="flex min-h-12 items-center justify-between px-4 text-foreground no-underline"
              >
                <span
                  className={`font-bold ${dia === hoje ? "text-primary" : ""}`}
                >
                  {diaPorExtenso(dia)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {marcadas.length === 0
                    ? "Sem marcações"
                    : marcadas.length === 1
                      ? "1 marcação"
                      : `${marcadas.length} marcações`}
                </span>
              </Link>
              {marcadas.length ? (
                <ul className="border-t border-border px-4 py-1">
                  {marcadas.map((l) => (
                    <li key={l.m.id}>
                      <Link
                        href={`/admin/marcacao/${l.m.id}`}
                        className="flex min-h-11 items-center gap-3 text-sm text-foreground no-underline"
                      >
                        <span className="tabular w-12 font-bold">{l.hora}</span>
                        <span className="flex-1 truncate">
                          {l.m.client?.name} · {l.m.service?.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      {/* Computador: grelha da semana */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full table-fixed border-separate border-spacing-1.5 text-sm">
          <thead>
            <tr>
              <th scope="col" className="w-16">
                <span className="sr-only">Hora</span>
              </th>
              {dias.map((d, i) => (
                <th key={d} scope="col" className="pb-1 text-left">
                  <Link
                    href={`/admin?dia=${d}`}
                    className={`block no-underline ${d === hoje ? "text-primary" : "text-foreground"}`}
                  >
                    {CURTO[i]} {Number(d.slice(8))}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horas.map((h) => (
              <tr key={h}>
                <th
                  scope="row"
                  className="tabular pt-3 text-left align-top font-bold"
                >
                  {h}
                </th>
                {porDia.map(({ dia, linhas }) => {
                  const l = linhas.find((x) => x.hora === h);
                  return (
                    <td key={dia} className="h-16 align-top">
                      {l?.tipo === "marcacao" ? (
                        <Link
                          href={`/admin/marcacao/${l.m.id}`}
                          className="flex h-full flex-col gap-1 rounded-md border border-border bg-card px-2.5 py-2 text-foreground no-underline shadow-card"
                        >
                          <span className="truncate font-bold">
                            {l.m.client?.name}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {l.m.service?.name}
                          </span>
                          {l.m.status !== "confirmed" ? (
                            <EstadoMarcacao estado={l.m.status} />
                          ) : null}
                        </Link>
                      ) : l?.tipo === "folga" ? (
                        <div className="flex h-full items-center rounded-md bg-muted px-2.5 text-xs text-muted-foreground">
                          Bloqueada
                        </div>
                      ) : l?.tipo === "livre" ? (
                        <Link
                          href={`/admin/nova?dia=${dia}&hora=${h}`}
                          className="flex h-full items-center rounded-md border border-dashed border-input px-2.5 text-xs font-semibold text-primary no-underline hover:bg-accent"
                        >
                          Livre
                        </Link>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {horas.length === 0 ? (
          <p className="py-6 text-muted-foreground">Sem horário esta semana.</p>
        ) : null}
      </div>
    </main>
  );
}
