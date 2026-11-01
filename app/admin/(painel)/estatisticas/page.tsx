import Link from "next/link";

import { exigirAdmin } from "@/lib/auth";
import { precoEmEuros } from "@/lib/datas";
import {
  type LinhaMarcacao,
  PERIODOS,
  calcular,
  percentagem,
} from "@/lib/admin/estatisticas";
import { supabaseSessao } from "@/lib/supabase/sessao";

export const metadata = { title: "Estatísticas | Painel" };

function Numero({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string | number;
  nota?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="font-display text-[30px] leading-9 font-semibold">
        {valor}
      </dd>
      {nota ? <dd className="text-sm text-muted-foreground">{nota}</dd> : null}
    </div>
  );
}

export default async function Estatisticas({
  searchParams,
}: PageProps<"/admin/estatisticas">) {
  const q = await searchParams;
  await exigirAdmin("/admin/estatisticas");
  const periodo = PERIODOS.find(([k]) => k === q.p) ?? PERIODOS[0];
  const agora = new Date();
  const desde = new Date(agora.getTime() - periodo[2] * 24 * 60 * 60 * 1000);

  // Um estúdio tem poucas marcações: ler tudo e contar aqui é simples e barato.
  const sb = await supabaseSessao();
  const [m, c] = await Promise.all([
    sb
      .from("appointments")
      .select(
        "client_id, status, origin, price_cents, starts_at, created_at, cancelled_at, cancelled_by, service:services(name)",
      )
      .limit(20000),
    sb
      .from("clients")
      .select("id", { count: "exact", head: true })
      .gte("created_at", desde.toISOString()),
  ]);
  if (m.error) return <p>Não foi possível ler as marcações.</p>;
  const e = calcular(m.data as unknown as LinhaMarcacao[], desde, agora);
  const canceladas = e.canceladasCliente + e.canceladasPainel;
  const maxServico = e.servicos[0]?.n ?? 0;

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-[32px] leading-9 font-semibold">
        Estatísticas
      </h1>
      <nav aria-label="Período" className="flex gap-2">
        {PERIODOS.map(([k, nome]) => (
          <Link
            key={k}
            href={`/admin/estatisticas?p=${k}`}
            aria-current={periodo[0] === k ? "true" : undefined}
            className={`inline-flex h-11 items-center rounded-full border px-4 text-sm font-semibold no-underline ${periodo[0] === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
          >
            {nome}
          </Link>
        ))}
      </nav>

      <dl className="grid grid-cols-2 gap-3">
        <Numero
          rotulo="Marcações feitas"
          valor={e.feitas}
          nota={`${percentagem(e.online, e.feitas)} online`}
        />
        <Numero
          rotulo="Atendidas"
          valor={e.atendidas}
          nota={`${precoEmEuros(e.faturado)} faturado`}
        />
        <Numero
          rotulo="Clientes novas"
          valor={c.count ?? 0}
          nota="fichas criadas"
        />
        <Numero
          rotulo="Voltaram"
          valor={e.regressaram}
          nota={`de ${e.clientesAtendidas} atendidas`}
        />
        <Numero
          rotulo="Canceladas"
          valor={canceladas}
          nota={`${e.canceladasCliente} pela cliente`}
        />
        <Numero rotulo="Faltas" valor={e.faltas} />
      </dl>

      <p className="text-sm text-muted-foreground">
        {e.naAgenda === 1
          ? "1 marcação na agenda daqui para a frente."
          : `${e.naAgenda} marcações na agenda daqui para a frente.`}{" "}
        Online: {e.online} · No painel: {e.painel}.
      </p>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold">Serviços mais marcados</h2>
        {e.servicos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem marcações neste período.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {e.servicos.map((s) => (
              <li key={s.nome} className="flex flex-col gap-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span>{s.nome}</span>
                  <span className="font-semibold tabular-nums">{s.n}</span>
                </div>
                <div aria-hidden className="h-2 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(s.n / maxServico) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        As visitas ao site estão no Vercel Analytics. Aqui só contam marcações.
      </p>
    </main>
  );
}
