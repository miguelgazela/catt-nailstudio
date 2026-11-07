"use client";

import { ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  diaDaSemana,
  diaPorExtenso,
  diaPorExtensoMinusculas,
  intervalo,
  mesDoDia,
  nomeDoMes,
  somarMeses,
} from "@/lib/datas";
import { cn } from "@/lib/utils";

import { CalendarDay } from "./calendar-day";
import { TimeSlot } from "./time-slot";

type Vaga = { dia: string; hora: string };

const CABECALHOS = ["S", "T", "Q", "Q", "S", "S", "D"];
const NOMES_CABECALHOS = [
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
];

export function DiaHora({
  servicoId,
  servicoNome,
  vagas,
  hoje,
  ultimoDia,
  diaInicial,
  ocupada,
}: {
  servicoId: string;
  servicoNome: string;
  vagas: Vaga[];
  hoje: string;
  ultimoDia: string;
  diaInicial?: string;
  ocupada?: boolean;
}) {
  const porDia = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const v of vagas) (m[v.dia] ??= []).push(v.hora);
    return m;
  }, [vagas]);
  const diasLivres = useMemo(() => Object.keys(porDia).sort(), [porDia]);

  const primeiro =
    diaInicial && porDia[diaInicial] ? diaInicial : (diasLivres[0] ?? null);
  const [dia, setDia] = useState<string | null>(primeiro);
  const [hora, setHora] = useState<string | null>(null);
  const [mes, setMes] = useState(mesDoDia(primeiro ?? hoje));

  const primeiroMes = mesDoDia(hoje);
  const ultimoMes = mesDoDia(ultimoDia);

  const celulas = useMemo(() => {
    const inicio = `${mes}-01`;
    const brancos = diaDaSemana(inicio);
    const total = new Date(
      Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0),
    ).getUTCDate();
    return { brancos, total };
  }, [mes]);

  const mesTemVagas = diasLivres.some((d) => mesDoDia(d) === mes);
  const mesTemPoucas = diasLivres.some(
    (d) => mesDoDia(d) === mes && porDia[d].length <= 2,
  );
  const horas = dia ? (porDia[dia] ?? []) : [];

  const href =
    dia && hora ? `/marcar?servico=${servicoId}&dia=${dia}&hora=${hora}` : null;

  return (
    <>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-4 pb-36">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Escolhe o dia e a hora
        </h1>

        {ocupada ? (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-danger-surface px-4 py-3 text-sm leading-5 text-danger"
          >
            <CircleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0" />
            Esta hora acabou de ser ocupada. Escolhe outra.
          </p>
        ) : null}

        <section aria-label="Calendário" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              disabled={mes <= primeiroMes}
              onClick={() => setMes(somarMeses(mes, -1))}
              className="inline-flex size-11 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <h2 className="text-base font-semibold" aria-live="polite">
              {nomeDoMes(mes)}
            </h2>
            <button
              type="button"
              aria-label="Mês seguinte"
              disabled={mes >= ultimoMes}
              onClick={() => setMes(somarMeses(mes, 1))}
              className="inline-flex size-11 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>

          <div
            role="group"
            aria-label={`Dias de ${nomeDoMes(mes)}`}
            className="grid grid-cols-7 gap-1"
          >
            {CABECALHOS.map((c, i) => (
              <span
                key={i}
                aria-hidden
                className="pb-1 text-center text-xs leading-4 font-semibold text-muted-foreground"
              >
                {c}
              </span>
            ))}
            {Array.from({ length: celulas.brancos }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: celulas.total }, (_, i) => {
              const n = i + 1;
              const d = `${mes}-${String(n).padStart(2, "0")}`;
              const livres = porDia[d]?.length ?? 0;
              const disponivel = livres > 0;
              const semana = NOMES_CABECALHOS[diaDaSemana(d)];
              const nomeMes = nomeDoMes(d.slice(0, 7)).split(" ")[0];
              const rotulo = `${semana}, ${n} de ${nomeMes}${
                !disponivel
                  ? ", sem vagas"
                  : livres <= 2
                    ? ", poucas vagas"
                    : ""
              }`;
              return (
                <CalendarDay
                  key={d}
                  dia={n}
                  rotulo={rotulo}
                  disponivel={disponivel}
                  selecionado={d === dia}
                  hoje={d === hoje}
                  poucas={livres > 0 && livres <= 2}
                  onEscolher={() => {
                    setDia(d);
                    setHora(null);
                  }}
                />
              );
            })}
          </div>
          {!mesTemVagas ? (
            <p className="text-sm text-muted-foreground">
              Sem vagas em {nomeDoMes(mes)}.
              {mes < ultimoMes ? " Vê o mês seguinte." : ""}
            </p>
          ) : null}
        </section>

        {dia ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold">{diaPorExtenso(dia)}</h2>
              {mesTemPoucas ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <span
                    aria-hidden
                    className="size-[5px] rounded-full bg-warning"
                  />
                  Poucas vagas
                </span>
              ) : null}
            </div>
            <div
              role="group"
              aria-label="Horas livres"
              className="grid grid-cols-4 gap-2"
            >
              {horas.map((h) => (
                <TimeSlot
                  key={h}
                  hora={h}
                  selecionada={h === hora}
                  onEscolher={() => setHora(h)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-card shadow-bar">
        <div className="mx-auto flex w-full max-w-xl items-center gap-4 px-5 pt-3.5 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
          <div className="tabular flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-base font-semibold">
              {dia && hora
                ? `${diaPorExtensoMinusculas(dia).replace(/^./, (c) => c.toUpperCase())}, ${hora}`
                : "Escolhe uma hora"}
            </span>
            <span className="truncate text-sm text-muted-foreground">
              {servicoNome}, 1 hora
              {hora ? ` (${intervalo(hora)})` : ""}
            </span>
          </div>
          {href ? (
            <Link
              href={href}
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground no-underline hover:bg-primary-pressed"
            >
              Continuar
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(
                "inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground opacity-45",
              )}
            >
              Continuar
            </span>
          )}
        </div>
      </div>
    </>
  );
}
