const HORA = 60 * 60 * 1000;

export type Candidata = { id: string; starts_at: string; created_at: string };

/**
 * Marcações a lembrar agora: começam dentro das próximas 48 h (mas não já a seguir)
 * e foram feitas com mais de 49 h de antecedência. Assim quem marca para daqui a um ou dois
 * dias não recebe a confirmação e um lembrete seguidos. 48 h dá tempo de cancelar (a regra é
 * até 24 h antes).
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
      inicio <= t + 48 * HORA &&
      criada <= inicio - 49 * HORA
    );
  });
}
