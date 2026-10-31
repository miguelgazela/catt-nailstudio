/** Só caminhos internos. Evita redirecionar para sites de fora depois do login. */
export function caminhoSeguro(
  next: string | null | undefined,
  porOmissao = "/conta",
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\r\n]/.test(next)
  ) {
    return porOmissao;
  }
  return next;
}
