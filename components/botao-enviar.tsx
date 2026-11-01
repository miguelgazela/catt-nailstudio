"use client";

import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Botão de envio para formulários com Server Action. Enquanto o servidor responde fica
 * bloqueado e mostra um indicador, para se ver logo que o toque contou (e não haver dois envios).
 * Botões só com ícone trocam o ícone pelo indicador.
 */
export function BotaoEnviar({
  children,
  className,
  disabled,
  soIcone = false,
  ...resto
}: Omit<ComponentProps<"button">, "type"> & { soIcone?: boolean }) {
  const { pending } = useFormStatus();
  const roda = (
    <LoaderCircle
      aria-hidden
      className={cn("shrink-0 animate-spin", soIcone ? "size-5" : "size-4")}
    />
  );
  return (
    <button
      {...resto}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(className, "gap-2 disabled:cursor-default")}
    >
      {soIcone ? (
        pending ? (
          roda
        ) : (
          children
        )
      ) : (
        <>
          {pending ? roda : null}
          {children}
        </>
      )}
    </button>
  );
}
