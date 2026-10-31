import { Ban, Check, CircleCheck, UserX } from "lucide-react";

import type { Estado } from "@/lib/admin/agenda";

const CONF = {
  confirmed: {
    t: "Confirmada",
    c: "bg-success-surface text-success",
    I: Check,
  },
  done: {
    t: "Concluída",
    c: "bg-success-surface text-success",
    I: CircleCheck,
  },
  no_show: { t: "Faltou", c: "bg-warning-surface text-warning", I: UserX },
  cancelled: { t: "Cancelada", c: "bg-danger-surface text-danger", I: Ban },
} as const;

export const NOME_ESTADO: Record<Estado, string> = {
  confirmed: "Confirmada",
  done: "Concluída",
  no_show: "Faltou",
  cancelled: "Cancelada",
};

// Estado com ícone e texto, nunca só cor.
export function EstadoMarcacao({ estado }: { estado: Estado }) {
  const { t, c, I } = CONF[estado];
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${c}`}
    >
      <I aria-hidden className="size-3.5" strokeWidth={2.5} />
      {t}
    </span>
  );
}
