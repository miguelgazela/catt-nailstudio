import { ArrowLeft, CalendarClock, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AvisoErro, botaoSecundario } from "@/components/admin/campos";
import { EstadoMarcacao } from "@/components/admin/estado-marcacao";
import { descreverAuditoria } from "@/lib/admin/auditoria";
import { getAuditoria, getMarcacao } from "@/lib/admin/dados";
import { exigirAdmin } from "@/lib/auth";
import { diaPorExtenso, emLisboa, intervalo, precoEmEuros } from "@/lib/datas";

import {
  cancelarMarcacao,
  marcarConcluida,
  marcarFalta,
  reabrirMarcacao,
} from "../actions";

const FEITO: Record<string, string> = {
  criada: "Marcação guardada.",
  movida: "Marcação movida.",
  cancelada: "Marcação cancelada.",
  falta: "Marcada como falta.",
  concluida: "Marcada como concluída.",
  reaberta: "Marcação reaberta.",
};

function Confirmar({
  id,
  acao,
  rotulo,
  texto,
  perigo,
}: {
  id: string;
  acao: (d: FormData) => Promise<void>;
  rotulo: string;
  texto: string;
  perigo?: boolean;
}) {
  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex min-h-12 cursor-pointer items-center px-4 text-base font-bold marker:content-none">
        {rotulo}
      </summary>
      <form
        action={acao}
        className="flex flex-col gap-3 border-t border-border px-4 py-4"
      >
        <input type="hidden" name="id" value={id} />
        <p className="text-sm leading-5 text-muted-foreground">{texto}</p>
        <button
          type="submit"
          className={`inline-flex h-12 items-center justify-center rounded-full text-base font-bold ${perigo ? "bg-danger-surface text-danger" : "bg-primary text-primary-foreground"}`}
        >
          {rotulo}
        </button>
      </form>
    </details>
  );
}

export default async function Detalhe({
  params,
  searchParams,
}: PageProps<"/admin/marcacao/[id]">) {
  const { id } = await params;
  const q = await searchParams;
  await exigirAdmin(`/admin/marcacao/${id}`);
  const m = await getMarcacao(id);
  if (!m) notFound();
  const registo = await getAuditoria("appointments", id);
  const { dia, hora } = emLisboa(m.starts_at);
  const feito = typeof q.feito === "string" ? FEITO[q.feito] : undefined;
  const tel = m.client?.phone;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5">
      <Link
        href={`/admin?dia=${dia}`}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary no-underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Agenda
      </Link>
      <h1 className="font-display text-[32px] leading-9 font-semibold">
        Marcação
      </h1>
      {feito ? (
        <p
          role="status"
          className="rounded-lg bg-success-surface px-4 py-3 text-sm text-success"
        >
          {feito}
        </p>
      ) : null}
      {q.erro === "estado" ? (
        <AvisoErro>Esta marcação já mudou. Veja o estado abaixo.</AvisoErro>
      ) : null}

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <p className="text-lg font-bold">{diaPorExtenso(dia)}</p>
          <EstadoMarcacao estado={m.status} />
        </div>
        <p className="tabular text-base">{intervalo(hora)}</p>
        <p className="text-base">
          {m.service?.name} · {precoEmEuros(m.price_cents)}
        </p>
        <p className="text-sm text-muted-foreground">
          {m.origin === "admin" ? "Marcada por si" : "Marcada online"}
        </p>
        {m.note ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">{m.note}</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
        <h2 className="text-sm font-bold text-muted-foreground">Cliente</h2>
        {m.client ? (
          <>
            <Link
              href={`/admin/clientes/${m.client.id}`}
              className="text-lg font-bold text-foreground"
            >
              {m.client.name}
            </Link>
            {tel ? (
              <div className="flex gap-2">
                <a
                  href={`tel:${tel}`}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-input text-sm font-bold text-foreground no-underline"
                >
                  <Phone aria-hidden className="size-4" /> Ligar
                </a>
                <a
                  href={`https://wa.me/${tel.replace("+", "")}`}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-input text-sm font-bold text-foreground no-underline"
                  rel="noreferrer"
                >
                  <MessageCircle aria-hidden className="size-4" /> WhatsApp
                </a>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        {m.status === "confirmed" ? (
          <>
            <Link
              href={`/admin/marcacao/${id}/mover`}
              className={botaoSecundario}
            >
              <CalendarClock aria-hidden className="size-5" /> Mover
            </Link>
            <Confirmar
              id={id}
              acao={marcarConcluida}
              rotulo="Marcar como concluída"
              texto="A marcação passa a concluída."
            />
            <Confirmar
              id={id}
              acao={marcarFalta}
              rotulo="Marcar falta"
              texto="A cliente não apareceu. Soma uma falta na ficha dela."
            />
            <Confirmar
              id={id}
              acao={cancelarMarcacao}
              rotulo="Cancelar marcação"
              perigo
              texto="A hora fica livre. A cliente não recebe aviso: contacte-a se for preciso."
            />
          </>
        ) : m.status === "no_show" || m.status === "done" ? (
          <Confirmar
            id={id}
            acao={reabrirMarcacao}
            rotulo="Voltar a confirmada"
            texto="Desfaz o estado e, se era falta, tira a falta da ficha."
          />
        ) : null}
      </section>

      <section aria-labelledby="reg" className="flex flex-col gap-2">
        <h2 id="reg" className="text-sm font-bold text-muted-foreground">
          Registo de alterações
        </h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {registo.length === 0 ? (
            <li className="text-muted-foreground">
              Sem alterações registadas.
            </li>
          ) : null}
          {registo.map((r, i) => {
            const t = emLisboa(r.at);
            return (
              <li key={i} className="flex gap-3 rounded-md bg-muted px-3 py-2">
                <span className="tabular shrink-0 text-muted-foreground">
                  {t.dia.slice(8)}/{t.dia.slice(5, 7)} {t.hora}
                </span>
                <span>{descreverAuditoria(r)}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
