import { ArrowLeft, Download, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AvisoErro, botaoSecundario } from "@/components/admin/campos";
import { EstadoMarcacao } from "@/components/admin/estado-marcacao";
import { buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/auth";
import { diaPorExtensoMinusculas, emLisboa, precoEmEuros } from "@/lib/datas";
import { supabaseSessao } from "@/lib/supabase/sessao";

import { apagarCliente, mudarBloqueio } from "../actions";
import { FormCliente } from "./form-cliente";

export default async function Ficha({
  params,
  searchParams,
}: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  const q = await searchParams;
  await exigirAdmin(`/admin/clientes/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sb = await supabaseSessao();
  const { data: c } = await sb
    .from("clients")
    .select(
      "id, name, phone, email, notes, blocked, no_show_count, anonymized_at, user_id, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  const { data: marcacoes } = await sb
    .from("appointments")
    .select("id, starts_at, status, price_cents, service:services(name)")
    .eq("client_id", id)
    .order("starts_at", { ascending: false })
    .limit(100);
  const apagada = c.anonymized_at !== null;
  const feito =
    q.feito === "bloqueada"
      ? "Cliente bloqueada. Já não consegue marcar online."
      : q.feito === "desbloqueada"
        ? "Cliente desbloqueada."
        : undefined;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6">
      <Link
        href="/admin/clientes"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary no-underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Clientes
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          {c.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {c.no_show_count} {c.no_show_count === 1 ? "falta" : "faltas"}
          {c.blocked ? " · Bloqueada" : ""}
          {c.user_id ? " · Tem conta" : ""}
        </p>
      </div>
      {feito ? (
        <p
          role="status"
          className="rounded-lg bg-success-surface px-4 py-3 text-sm text-success"
        >
          {feito}
        </p>
      ) : null}
      {q.erro === "apagar" ? (
        <AvisoErro>Não foi possível apagar. Tente outra vez.</AvisoErro>
      ) : null}

      {apagada ? (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
          Os dados pessoais desta cliente foram apagados. O histórico fica para
          as contas da agenda.
        </p>
      ) : (
        <>
          <Link
            href={`/admin/nova?cliente=${c.id}`}
            className={buttonVariants({ className: "no-underline" })}
          >
            <Plus aria-hidden /> Nova marcação
          </Link>
          <FormCliente cliente={c} />
        </>
      )}

      <section aria-labelledby="hist" className="flex flex-col gap-2">
        <h2 id="hist" className="text-xl font-bold">
          Histórico
        </h2>
        {(marcacoes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem marcações.</p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {(marcacoes ?? []).map((m) => {
            const t = emLisboa(m.starts_at);
            return (
              <li key={m.id}>
                <Link
                  href={`/admin/marcacao/${m.id}`}
                  className="flex min-h-14 flex-col gap-1 rounded-lg border border-border bg-card px-4 py-2.5 text-foreground no-underline"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">
                      {diaPorExtensoMinusculas(t.dia)}, {t.hora}
                    </span>
                    <EstadoMarcacao estado={m.status} />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {(m.service as unknown as { name: string } | null)?.name} ·{" "}
                    {precoEmEuros(m.price_cents)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {!apagada ? (
        <section aria-labelledby="gerir" className="flex flex-col gap-3">
          <h2 id="gerir" className="text-xl font-bold">
            Gerir
          </h2>
          <form action={mudarBloqueio}>
            <input type="hidden" name="id" value={c.id} />
            <input
              type="hidden"
              name="bloquear"
              value={c.blocked ? "0" : "1"}
            />
            <button type="submit" className={botaoSecundario}>
              {c.blocked ? "Desbloquear" : "Bloquear (não pode marcar online)"}
            </button>
          </form>
          <a
            href={`/admin/clientes/${c.id}/exportar`}
            className={botaoSecundario}
          >
            <Download aria-hidden className="size-5" /> Exportar dados (JSON)
          </a>
          <details className="rounded-lg border border-border bg-card">
            <summary className="flex min-h-12 cursor-pointer items-center px-4 text-base font-bold text-danger marker:content-none">
              Apagar dados da cliente
            </summary>
            <form
              action={apagarCliente}
              className="flex flex-col gap-3 border-t border-border px-4 py-4"
            >
              <input type="hidden" name="id" value={c.id} />
              <p className="text-sm leading-5 text-muted-foreground">
                Apaga nome, telemóvel, email e notas. O histórico de marcações
                fica como “Cliente apagada”. Não se pode desfazer.
              </p>
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-full bg-danger-surface text-base font-bold text-danger"
              >
                Apagar dados
              </button>
            </form>
          </details>
        </section>
      ) : null}
    </main>
  );
}
