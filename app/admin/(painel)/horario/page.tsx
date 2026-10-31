import { Trash2 } from "lucide-react";

import { AvisoErro, Campo, botaoPrimario } from "@/components/admin/campos";
import { exigirAdmin } from "@/lib/auth";
import { diaPorExtensoMinusculas, emLisboa, hojeEmLisboa } from "@/lib/datas";
import { supabaseSessao } from "@/lib/supabase/sessao";

import {
  adicionarBloqueio,
  adicionarPeriodo,
  removerBloqueio,
  removerPeriodo,
} from "./actions";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const ERROS: Record<string, string> = {
  periodo: "Não foi possível guardar o período. Confirme as horas.",
  curto: "O período tem de ter pelo menos 1 hora.",
  sobrepoe: "Esse período sobrepõe-se a outro do mesmo dia.",
  datas: "Confirme as datas e as horas.",
};
const FEITOS: Record<string, string> = {
  periodo: "Período guardado.",
  "periodo-removido": "Período removido.",
  bloqueio: "Bloqueio guardado.",
  "bloqueio-removido": "Bloqueio removido.",
};

const botaoLixo =
  "inline-flex size-11 items-center justify-center rounded-full text-danger hover:bg-danger-surface";
const classeSelect =
  "min-h-12 w-full rounded-md border border-input bg-card px-4 text-base";

function formatarFolga(ini: string, fim: string) {
  const a = emLisboa(ini);
  const b = emLisboa(new Date(Date.parse(fim) - 1000));
  const diaInteiro = a.hora === "00:00" && emLisboa(fim).hora === "00:00";
  if (diaInteiro) {
    return a.dia === b.dia
      ? diaPorExtensoMinusculas(a.dia)
      : `${diaPorExtensoMinusculas(a.dia)} a ${diaPorExtensoMinusculas(b.dia)}`;
  }
  return `${diaPorExtensoMinusculas(a.dia)}, ${a.hora} às ${emLisboa(fim).hora}`;
}

export default async function Horario({ searchParams }: PageProps<"/admin/horario">) {
  const q = await searchParams;
  await exigirAdmin("/admin/horario");
  const sb = await supabaseSessao();
  const [{ data: periodos }, { data: folgas }] = await Promise.all([
    sb.from("weekly_hours").select("id, weekday, start_time, end_time").order("weekday").order("start_time"),
    sb.from("time_off").select("id, starts_at, ends_at, reason").gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);
  const erro = typeof q.erro === "string" ? ERROS[q.erro] : undefined;
  const feito = typeof q.feito === "string" ? FEITOS[q.feito] : undefined;
  const afetadas = Number(q.afetadas) || 0;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8">
      <h1 className="font-display text-[32px] leading-9 font-semibold">Horário</h1>
      {erro ? <AvisoErro>{erro}</AvisoErro> : null}
      {feito ? <p role="status" className="rounded-lg bg-success-surface px-4 py-3 text-sm text-success">{feito}</p> : null}
      {afetadas ? (
        <p role="status" className="rounded-lg bg-warning-surface px-4 py-3 text-sm text-warning">
          Atenção: já há {afetadas === 1 ? "1 marcação" : `${afetadas} marcações`} neste período. Não foram canceladas.
        </p>
      ) : null}

      <section aria-labelledby="semanal" className="flex flex-col gap-4">
        <h2 id="semanal" className="text-xl font-bold">Horário semanal</h2>
        <p className="text-sm text-muted-foreground">
          As horas de início contam a partir do início de cada período, de 1 em 1 hora. Para uma pausa, use dois períodos no mesmo dia.
        </p>
        <ul className="flex flex-col gap-2">
          {DIAS.map((nome, i) => {
            const do_dia = (periodos ?? []).filter((p) => p.weekday === i + 1);
            return (
              <li key={nome} className="rounded-lg border border-border bg-card px-4 py-2">
                <p className="pt-1 text-sm font-bold">{nome}</p>
                {do_dia.length === 0 ? (
                  <p className="min-h-11 py-2.5 text-sm text-muted-foreground">Fechado</p>
                ) : (
                  <ul>
                    {do_dia.map((p) => (
                      <li key={p.id} className="flex min-h-11 items-center justify-between">
                        <span className="tabular text-base">{p.start_time.slice(0, 5)} às {p.end_time.slice(0, 5)}</span>
                        <form action={removerPeriodo}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className={botaoLixo} aria-label={`Remover período de ${nome} ${p.start_time.slice(0, 5)}`}>
                            <Trash2 aria-hidden className="size-5" />
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <form action={adicionarPeriodo} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-bold">Acrescentar período</h3>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="weekday" className="text-sm font-semibold">Dia</label>
            <select id="weekday" name="weekday" className={classeSelect}>
              {DIAS.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="inicio" rotulo="Das" type="time" required />
            <Campo id="fim" rotulo="Às" type="time" required />
          </div>
          <button type="submit" className={botaoPrimario}>Acrescentar</button>
        </form>
      </section>

      <section aria-labelledby="bloqueios" className="flex flex-col gap-4">
        <h2 id="bloqueios" className="text-xl font-bold">Bloqueios e férias</h2>
        <ul className="flex flex-col gap-2">
          {(folgas ?? []).length === 0 ? <li className="text-sm text-muted-foreground">Sem bloqueios.</li> : null}
          {(folgas ?? []).map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card py-1 pr-1 pl-4">
              <span className="flex flex-col py-2 text-sm">
                <span className="font-bold">{formatarFolga(f.starts_at, f.ends_at)}</span>
                {f.reason ? <span className="text-muted-foreground">{f.reason}</span> : null}
              </span>
              <form action={removerBloqueio}>
                <input type="hidden" name="id" value={f.id} />
                <button type="submit" className={botaoLixo} aria-label="Remover bloqueio">
                  <Trash2 aria-hidden className="size-5" />
                </button>
              </form>
            </li>
          ))}
        </ul>

        <form action={adicionarBloqueio} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-bold">Férias ou dias fechados</h3>
          <input type="hidden" name="tipo" value="dias" />
          <div className="grid grid-cols-2 gap-3">
            <Campo id="de" rotulo="Do dia" type="date" required defaultValue={hojeEmLisboa()} />
            <Campo id="ate" rotulo="Ao dia" type="date" ajuda="Vazio = só esse dia" />
          </div>
          <Campo id="motivo-dias" name="motivo" rotulo="Motivo (opcional)" maxLength={100} />
          <button type="submit" className={botaoPrimario}>Bloquear dias</button>
        </form>

        <form action={adicionarBloqueio} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-bold">Bloquear umas horas</h3>
          <input type="hidden" name="tipo" value="horas" />
          <Campo id="dia" rotulo="Dia" type="date" required defaultValue={hojeEmLisboa()} />
          <div className="grid grid-cols-2 gap-3">
            <Campo id="hora_de" rotulo="Das" type="time" required />
            <Campo id="hora_ate" rotulo="Às" type="time" required />
          </div>
          <Campo id="motivo-horas" name="motivo" rotulo="Motivo (opcional)" maxLength={100} />
          <button type="submit" className={botaoPrimario}>Bloquear horas</button>
        </form>
      </section>
    </main>
  );
}
