import { cn } from "@/lib/utils";

export function CalendarDay({
  dia,
  rotulo,
  disponivel,
  selecionado,
  hoje,
  poucas,
  onEscolher,
}: {
  dia: number;
  rotulo: string;
  disponivel: boolean;
  selecionado: boolean;
  hoje: boolean;
  poucas: boolean;
  onEscolher: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!disponivel}
      aria-pressed={disponivel ? selecionado : undefined}
      aria-label={rotulo}
      aria-current={hoje ? "date" : undefined}
      onClick={onEscolher}
      className={cn(
        "tabular relative aspect-square min-h-11 rounded-[10px] text-base transition-colors",
        !disponivel &&
          "cursor-not-allowed font-normal text-muted-foreground opacity-60",
        disponivel &&
          !selecionado &&
          "bg-card font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-accent",
        selecionado && "bg-primary font-semibold text-primary-foreground",
        hoje && !selecionado && "shadow-[inset_0_0_0_1.5px_var(--primary)]",
      )}
    >
      {dia}
      {poucas && disponivel ? (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-[5px] left-1/2 size-[5px] -translate-x-1/2 rounded-full",
            selecionado ? "bg-primary-foreground" : "bg-warning",
          )}
        />
      ) : null}
    </button>
  );
}
