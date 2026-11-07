"use client";

import { CircleAlert, Info, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";

import { type EstadoForm, reservar } from "@/app/marcar/actions";
import { cn } from "@/lib/utils";

import { Turnstile } from "./turnstile";

const campo =
  "min-h-12 w-full rounded-md border border-input bg-card px-4 text-base text-foreground placeholder:text-muted-foreground aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive";

function Campo({
  id,
  rotulo,
  opcional,
  ajuda,
  erro,
  children,
}: {
  id: string;
  rotulo: string;
  opcional?: boolean;
  ajuda?: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm leading-5 font-semibold">
        {rotulo}
        {opcional ? (
          <span className="font-normal text-muted-foreground"> (opcional)</span>
        ) : null}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-[13px] leading-[18px] text-danger">
          {erro}
        </p>
      ) : null}
      {ajuda ? (
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

const inicial: EstadoForm = {};

export function FormDados({
  servicoId,
  dia,
  hora,
  siteKey,
}: {
  servicoId: string;
  dia: string;
  hora: string;
  siteKey: string;
}) {
  const [pronto, setPronto] = useState(false);
  const aoMudar = useCallback((p: boolean) => setPronto(p), []);
  // O token do Turnstile só vale uma vez: pede outro depois de cada tentativa.
  const [estado, acao, pendente] = useActionState(
    async (anterior: EstadoForm, dados: FormData) => {
      const r = await reservar(anterior, dados);
      setPronto(false);
      window.turnstile?.reset();
      return r;
    },
    inicial,
  );

  const v = estado.valores;
  const c = estado.campos ?? {};
  const descreve = (id: string, tem: boolean, ajuda: boolean) =>
    [tem ? `${id}-erro` : null, ajuda ? `${id}-ajuda` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form action={acao} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="servico" value={servicoId} />
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="hora" value={hora} />

      {estado.erro ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg bg-danger-surface px-4 py-3 text-sm leading-5 text-danger"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0" />
          {estado.erro}
        </p>
      ) : null}

      <Campo id="nome" rotulo="Nome" erro={c.nome}>
        <input
          id="nome"
          name="nome"
          type="text"
          autoComplete="name"
          required
          defaultValue={v?.nome}
          aria-invalid={c.nome ? true : undefined}
          aria-describedby={descreve("nome", !!c.nome, false)}
          className={campo}
        />
      </Campo>

      <Campo
        id="tel"
        rotulo="Telemóvel"
        ajuda="Só para a Catarina a contactar se precisares."
        erro={c.tel}
      >
        <input
          id="tel"
          name="tel"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          defaultValue={v?.tel}
          aria-invalid={c.tel ? true : undefined}
          aria-describedby={descreve("tel", !!c.tel, true)}
          className={cn(campo, "tabular")}
        />
      </Campo>

      <Campo
        id="email"
        rotulo="Email"
        opcional
        ajuda="Para receber a confirmação e o link de cancelamento."
        erro={c.email}
      >
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nome@exemplo.pt"
          defaultValue={v?.email}
          aria-invalid={c.email ? true : undefined}
          aria-describedby={descreve("email", !!c.email, true)}
          className={campo}
        />
      </Campo>

      <p className="flex items-start gap-2.5 rounded-lg bg-secondary px-4 py-3.5 text-sm leading-5 text-secondary-foreground">
        <Info aria-hidden className="mt-px size-[18px] shrink-0" />
        Sem conta podes ter 1 marcação futura de cada vez. Se deixares o email,
        recebes um link para cancelar até 24 h antes.
      </p>

      <Turnstile siteKey={siteKey} pronto={pronto} aoMudar={aoMudar} />

      <div className="flex flex-col gap-2.5">
        <button
          type="submit"
          disabled={pendente || !pronto}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground transition-colors hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendente ? (
            <>
              <LoaderCircle aria-hidden className="size-5 animate-spin" />A
              confirmar
            </>
          ) : (
            "Confirmar marcação"
          )}
        </button>
        <p className="text-center text-[13px] leading-[18px] text-muted-foreground">
          Usamos estes dados só para gerir a tua marcação.{" "}
          <Link
            href="/privacidade"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Como tratamos os teus dados
          </Link>
        </p>
      </div>
    </form>
  );
}
