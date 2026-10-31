import { CircleAlert, Info } from "lucide-react";

export function Aviso({
  tipo = "erro",
  children,
}: {
  tipo?: "erro" | "info";
  children: React.ReactNode;
}) {
  const Icone = tipo === "erro" ? CircleAlert : Info;
  return (
    <p
      role={tipo === "erro" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm leading-5 ${tipo === "erro" ? "bg-danger-surface text-danger" : "bg-secondary text-secondary-foreground"}`}
    >
      <Icone aria-hidden className="mt-0.5 size-[18px] shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export const campoTexto =
  "min-h-12 w-full rounded-md border border-input bg-card px-4 text-base text-foreground placeholder:text-muted-foreground";
