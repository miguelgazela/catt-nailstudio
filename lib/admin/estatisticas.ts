// Números do negócio a partir das marcações. Tudo puro, para testar sem base de dados.

export type LinhaMarcacao = {
  client_id: string;
  status: "confirmed" | "cancelled" | "no_show" | "done";
  origin: "online" | "admin";
  price_cents: number;
  starts_at: string;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  service: { name: string } | null;
};

export const PERIODOS = [
  ["30", "30 dias", 30],
  ["90", "90 dias", 90],
  ["365", "12 meses", 365],
] as const;

export type Estatisticas = {
  feitas: number;
  online: number;
  painel: number;
  atendidas: number;
  faturado: number;
  clientesAtendidas: number;
  regressaram: number;
  canceladasCliente: number;
  canceladasPainel: number;
  faltas: number;
  naAgenda: number;
  servicos: { nome: string; n: number }[];
};

const t = (iso: string) => new Date(iso).getTime();

/** O período é [desde, agora]. "Atendida" = já passou e não foi cancelada nem falta. */
export function calcular(
  linhas: LinhaMarcacao[],
  desde: Date,
  agora: Date,
): Estatisticas {
  const d = desde.getTime();
  const a = agora.getTime();
  const dentro = (iso: string | null) =>
    iso !== null && t(iso) >= d && t(iso) <= a;

  const feitas = linhas.filter((l) => dentro(l.created_at));
  const atendida = (l: LinhaMarcacao) =>
    (l.status === "done" || l.status === "confirmed") && t(l.starts_at) <= a;
  const atendidas = linhas.filter((l) => atendida(l) && dentro(l.starts_at));
  const canceladas = linhas.filter(
    (l) => l.status === "cancelled" && dentro(l.cancelled_at),
  );

  const clientes = new Set(atendidas.map((l) => l.client_id));
  const antes = new Set(
    linhas
      .filter((l) => atendida(l) && t(l.starts_at) < d)
      .map((l) => l.client_id),
  );

  const porServico = new Map<string, number>();
  for (const l of feitas) {
    if (l.status === "cancelled") continue;
    const nome = l.service?.name ?? "Sem serviço";
    porServico.set(nome, (porServico.get(nome) ?? 0) + 1);
  }

  return {
    feitas: feitas.length,
    online: feitas.filter((l) => l.origin === "online").length,
    painel: feitas.filter((l) => l.origin === "admin").length,
    atendidas: atendidas.length,
    faturado: atendidas.reduce((s, l) => s + l.price_cents, 0),
    clientesAtendidas: clientes.size,
    regressaram: [...clientes].filter((c) => antes.has(c)).length,
    canceladasCliente: canceladas.filter((l) => l.cancelled_by === "client")
      .length,
    canceladasPainel: canceladas.filter((l) => l.cancelled_by !== "client")
      .length,
    faltas: linhas.filter((l) => l.status === "no_show" && dentro(l.starts_at))
      .length,
    naAgenda: linhas.filter(
      (l) => l.status === "confirmed" && t(l.starts_at) > a,
    ).length,
    servicos: [...porServico]
      .map(([nome, n]) => ({ nome, n }))
      .sort((x, y) => y.n - x.n || x.nome.localeCompare(y.nome, "pt")),
  };
}

export function percentagem(parte: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((parte / total) * 100)}%`;
}
