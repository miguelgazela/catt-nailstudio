const HORA = 60 * 60 * 1000;

export type Candidata = { id: string; starts_at: string; created_at: string };

/**
 * Marcações a lembrar agora: começam dentro das próximas 24 h (mas não já a seguir)
 * e foram feitas com mais de 25 h de antecedência. Assim quem marca para o dia seguinte
 * não recebe a confirmação e um lembrete seguidos.
 */
export function elegiveisParaLembrete<T extends Candidata>(
  linhas: T[],
  agora: Date,
): T[] {
  const t = agora.getTime();
  return linhas.filter((l) => {
    const inicio = new Date(l.starts_at).getTime();
    const criada = new Date(l.created_at).getTime();
    return (
      inicio > t + HORA &&
      inicio <= t + 24 * HORA &&
      criada <= inicio - 25 * HORA
    );
  });
}
