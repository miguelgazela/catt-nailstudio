import { Cabecalho } from "./cabecalho";

/**
 * Ecrã de espera das páginas públicas (usado nos loading.tsx). O Next guarda-o de antemão,
 * por isso a mudança de página é imediata e os dados aparecem quando o servidor responde.
 * Sem dados nem sessão: tem de poder ser pré-gerado.
 */
export function EsqueletoPagina({
  topo = "cabecalho",
  blocos = 3,
}: {
  /** "passo": barra de progresso do /marcar; "cabecalho": logótipo; "nada": só o conteúdo. */
  topo?: "cabecalho" | "passo" | "nada";
  blocos?: number;
}) {
  return (
    <>
      {topo === "cabecalho" ? <Cabecalho semEntrar /> : null}
      {topo === "passo" ? (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-5 pt-2">
          <div className="h-11" />
          <div className="flex gap-1.5 pl-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1 flex-1 rounded-full bg-border" />
            ))}
          </div>
        </div>
      ) : null}
      <main
        role="status"
        aria-label="A carregar"
        className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-4 pb-10 motion-safe:animate-pulse"
      >
        <div className="h-9 w-48 rounded-md bg-secondary" />
        <div className="h-5 w-64 max-w-full rounded-md bg-secondary" />
        <div className="mt-2 flex flex-col gap-3">
          {Array.from({ length: blocos }, (_, i) => (
            <div key={i} className="h-20 rounded-lg bg-secondary" />
          ))}
        </div>
      </main>
    </>
  );
}
