import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/auth";
import { precoEmEuros } from "@/lib/datas";
import { supabaseSessao } from "@/lib/supabase/sessao";

import { moverServico, mudarAtivo } from "./actions";

const FEITOS: Record<string, string> = {
  criado: "Serviço criado.",
  guardado: "Serviço guardado.",
  ativado: "Serviço visível para as clientes.",
  desativado: "Serviço escondido das clientes.",
};

const seta =
  "inline-flex size-11 items-center justify-center rounded-full border border-border text-foreground hover:bg-accent disabled:opacity-30";

export default async function Servicos({
  searchParams,
}: PageProps<"/admin/servicos">) {
  const q = await searchParams;
  await exigirAdmin("/admin/servicos");
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("services")
    .select("id, name, price_cents, active, photo_url")
    .order("sort_order")
    .order("created_at");
  const lista = data ?? [];
  const feito = typeof q.feito === "string" ? FEITOS[q.feito] : undefined;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-[32px] leading-9 font-semibold">
        Serviços
      </h1>
      {feito ? (
        <p
          role="status"
          className="rounded-lg bg-success-surface px-4 py-3 text-sm text-success"
        >
          {feito}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        A ordem aqui é a ordem que as clientes veem. Todas as marcações duram 1
        hora.
      </p>
      <ul className="flex flex-col gap-2.5">
        {lista.map((s, i) => (
          <li
            key={s.id}
            className={`flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-card ${s.active ? "" : "opacity-80"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/servicos/${s.id}`}
                  className="text-base font-bold text-foreground"
                >
                  {s.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {precoEmEuros(s.price_cents)} ·{" "}
                  {s.active ? "Visível" : "Escondido"}
                  {s.photo_url ? " · com foto" : ""}
                </p>
              </div>
              <div className="flex gap-1.5">
                <form action={moverServico}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="dir" value="cima" />
                  <button
                    type="submit"
                    disabled={i === 0}
                    className={seta}
                    aria-label={`Subir ${s.name}`}
                  >
                    <ArrowUp aria-hidden className="size-5" />
                  </button>
                </form>
                <form action={moverServico}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="dir" value="baixo" />
                  <button
                    type="submit"
                    disabled={i === lista.length - 1}
                    className={seta}
                    aria-label={`Descer ${s.name}`}
                  >
                    <ArrowDown aria-hidden className="size-5" />
                  </button>
                </form>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/admin/servicos/${s.id}`}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-input text-sm font-bold text-foreground no-underline"
              >
                Editar
              </Link>
              <form action={mudarAtivo} className="flex-1">
                <input type="hidden" name="id" value={s.id} />
                <input
                  type="hidden"
                  name="ativo"
                  value={s.active ? "0" : "1"}
                />
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                >
                  {s.active ? "Esconder" : "Mostrar"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/admin/servicos/novo"
        className={buttonVariants({ className: "no-underline" })}
      >
        <Plus aria-hidden /> Novo serviço
      </Link>
    </main>
  );
}
