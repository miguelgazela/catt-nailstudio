import { cn } from "@/lib/utils";

export function TimeSlot({
  hora,
  selecionada,
  onEscolher,
}: {
  hora: string;
  selecionada: boolean;
  onEscolher: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionada}
      onClick={onEscolher}
      className={cn(
        "tabular min-h-11 rounded-[10px] border text-[15px] font-semibold transition-colors",
        selecionada
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-card text-foreground hover:bg-accent",
      )}
    >
      {hora}
    </button>
  );
}
