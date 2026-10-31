import { CircleAlert } from "lucide-react";
import type { ComponentProps } from "react";

export const classeInput =
  "min-h-12 w-full rounded-md border border-input bg-card px-4 text-base text-foreground placeholder:text-muted-foreground aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive";

export function Campo({
  id,
  rotulo,
  erro,
  ajuda,
  ...resto
}: {
  id: string;
  rotulo: string;
  erro?: string;
  ajuda?: string;
} & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm leading-5 font-semibold">
        {rotulo}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={
          erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined
        }
        className={classeInput}
        {...resto}
      />
      {erro ? (
        <p id={`${id}-erro`} className="text-[13px] leading-[18px] text-danger">
          {erro}
        </p>
      ) : ajuda ? (
        <p
          id={`${id}-ajuda`}
          className="text-[13px] leading-[18px] text-muted-foreground"
        >
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}

export function AvisoErro({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2.5 rounded-lg bg-danger-surface px-4 py-3 text-sm leading-5 text-danger"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0" />
      {children}
    </p>
  );
}

export const botaoPrimario =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground transition-colors hover:bg-primary-pressed disabled:opacity-60 no-underline";
export const botaoSecundario =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-input bg-card text-base font-bold text-foreground transition-colors hover:bg-accent no-underline";
