export type EstadoMarcacao = "confirmed" | "cancelled" | "no_show" | "done";

export type MarcacaoConta = {
  id: string;
  inicio: string;
  servico: string;
  precoCents: number;
  estado: EstadoMarcacao;
};

/** Só se cancela uma marcação confirmada, até `horas` antes (a BD volta a validar). */
export function podeCancelar(
  m: Pick<MarcacaoConta, "inicio" | "estado">,
  agora: Date,
  horas: number,
): boolean {
  return (
    m.estado === "confirmed" &&
    new Date(m.inicio).getTime() - agora.getTime() >= horas * 3600_000
  );
}

/** Próximas = confirmadas que ainda não começaram (mais perto primeiro). O resto é histórico (mais recente primeiro). */
export function separar(ms: MarcacaoConta[], agora: Date) {
  const t = (m: MarcacaoConta) => new Date(m.inicio).getTime();
  const proximas = ms
    .filter((m) => m.estado === "confirmed" && t(m) > agora.getTime())
    .sort((a, b) => t(a) - t(b));
  const anteriores = ms
    .filter((m) => !proximas.includes(m))
    .sort((a, b) => t(b) - t(a));
  return { proximas, anteriores };
}
