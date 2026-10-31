import { Search } from "lucide-react";
import Link from "next/link";

import { exigirAdmin } from "@/lib/auth";
import { supabaseSessao } from "@/lib/supabase/sessao";

const FILTROS = [
  ["todas", "Todas"],
  ["faltas", "Com faltas"],
  ["bloqueadas", "Bloqueadas"],
] as const;

export default async function Clientes({ searchParams }: PageProps<"/admin/clientes">) {
  const q = await searchParams;
  await exigirAdmin("/admin/clientes");
  const texto = (typeof q.q === "string" ? q.q : "").trim().slice(0, 60);
  const filtro = FILTROS.some(([k]) => k === q.f) ? (q.f as string) : "todas";

  const sb = await supabaseSessao();
  let consulta = sb
    .from("clients")
    .select("id, name, phone, email, blocked, no_show_count")
    .is("anonymized_at", null)
    .order("name")
    .limit(100);
  if (filtro === "faltas") consulta = consulta.gt("no_show_count", 0);
  if (filtro === "bloqueadas") consulta = consulta.eq("blocked", true);
  if (texto) {
    // Só letras, números e espaços: evita sintaxe do filtro PostgREST.
    const limpo = texto.replace(/[^\p{L}\p{N}@. +-]/gu, "");
    const digitos = limpo.replace(/\D/g, "");
    const partes = [`name.ilike.%${limpo}%`, `email.ilike.%${limpo}%`];
    if (digitos.length >= 3) partes.push(`phone.ilike.%${digitos}%`);
    consulta = consulta.or(partes.join(","));
  }
  const { data } = await consulta;
  const lista = data ?? [];
  const feito = q.feito === "apagada" ? "Dados da cliente apagados." : undefined;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-[32px] leading-9 font-semibold">Clientes</h1>
      {feito ? <p role="status" className="rounded-lg bg-success-surface px-4 py-3 text-sm text-success">{feito}</p> : null}
      <form role="search" className="flex flex-col gap-3">
        <input type="hidden" name="f" value={filtro} />
        <div className="relative">
          <Search aria-hidden className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={texto}
            aria-label="Pesquisar clientes"
            placeholder="Nome, telemóvel ou email"
            className="min-h-12 w-full rounded-full border border-input bg-card pr-4 pl-12 text-base"
          />
        </div>
      </form>
      <nav aria-label="Filtros" className="flex gap-2">
        {FILTROS.map(([k, n]) => (
          <Link
            key={k}
            href={`/admin/clientes?f=${k}${texto ? `&q=${encodeURIComponent(texto)}` : ""}`}
            aria-current={filtro === k ? "true" : undefined}
            className={`inline-flex h-11 items-center rounded-full border px-4 text-sm font-semibold no-underline ${filtro === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
          >
            {n}
          </Link>
        ))}
      </nav>
      {lista.length === 0 ? (
        <p className="rounded-lg border border-border bg-card px-4 py-5 text-base text-muted-foreground">Nenhuma cliente encontrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/clientes/${c.id}`} className="flex min-h-14 flex-col justify-center gap-0.5 rounded-lg border border-border bg-card px-4 py-2.5 text-foreground no-underline shadow-card">
                <span className="text-base font-bold">{c.name}</span>
                <span className="text-sm text-muted-foreground">
                  {c.phone ?? c.email ?? "Sem contacto"}
                  {c.no_show_count ? ` · ${c.no_show_count} ${c.no_show_count === 1 ? "falta" : "faltas"}` : ""}
                  {c.blocked ? " · Bloqueada" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
