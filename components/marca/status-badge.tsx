import { Check } from "lucide-react";

// Estado com ícone e texto, nunca só cor.
export function StatusBadge({ estado }: { estado: "confirmada" }) {
  if (estado === "confirmada") {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-success-surface px-3 text-[13px] font-semibold text-success">
        <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
        Confirmada
      </span>
    );
  }
  return null;
}
