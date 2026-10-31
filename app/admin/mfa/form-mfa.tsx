"use client";

import { CircleAlert, LoaderCircle, ShieldCheck } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  type EstadoCodigo,
  type Inscricao,
  comecarInscricao,
  confirmarCodigo,
} from "./actions";

const inicial: EstadoCodigo = {};

function Codigo({
  factorId,
  destino,
  rotulo,
}: {
  factorId: string;
  destino: string;
  rotulo: string;
}) {
  const [estado, acao, pendente] = useActionState(confirmarCodigo, inicial);
  return (
    <form action={acao} noValidate className="flex flex-col gap-[18px]">
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="next" value={destino} />
      {estado.erro ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg bg-danger-surface px-4 py-3 text-sm leading-5 text-danger"
        >
          <CircleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0" />
          {estado.erro}
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="codigo" className="text-sm leading-5 font-semibold">
          {rotulo}
        </label>
        <input
          id="codigo"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          required
          className="tabular min-h-12 w-full rounded-md border border-input bg-card px-4 text-center text-xl tracking-[0.3em] text-foreground"
        />
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground transition-colors hover:bg-primary-pressed disabled:opacity-60"
      >
        {pendente ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
        ) : null}
        Entrar no painel
      </button>
    </form>
  );
}

export function FormMfa({
  factorId,
  destino,
}: {
  factorId: string | null;
  destino: string;
}) {
  const [insc, setInsc] = useState<Inscricao | null>(null);
  const [pendente, iniciar] = useTransition();

  if (factorId) {
    return (
      <>
        <p className="text-base leading-6 text-muted-foreground">
          Abra a app autenticadora e escreva o código de 6 números.
        </p>
        <Codigo factorId={factorId} destino={destino} rotulo="Código da app" />
      </>
    );
  }

  if (insc?.factorId) {
    return (
      <>
        <p className="text-base leading-6">
          1. Na app autenticadora (Google Authenticator, Microsoft
          Authenticator, 1Password…), leia este código QR.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={insc.qr}
          alt="Código QR para a app autenticadora"
          className="size-48 self-center rounded-lg border border-border bg-white p-2"
        />
        <p className="text-sm leading-5 text-muted-foreground">
          Não consegue ler? Escreva este código na app:{" "}
          <code className="tabular font-semibold break-all text-foreground">
            {insc.segredo}
          </code>
        </p>
        <p className="text-base leading-6">
          2. Escreva o código que a app mostra.
        </p>
        <Codigo
          factorId={insc.factorId}
          destino={destino}
          rotulo="Código da app"
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-5">
        <ShieldCheck aria-hidden className="size-7 text-primary" />
        <p className="text-base leading-6">
          O painel tem dados de clientes, por isso pede um segundo passo: um
          código de 6 números numa app autenticadora, no seu telemóvel. Só é
          preciso configurar uma vez.
        </p>
      </div>
      {insc?.erro ? (
        <p role="alert" className="text-sm text-danger">
          {insc.erro}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pendente}
        onClick={() => iniciar(async () => setInsc(await comecarInscricao()))}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground transition-colors hover:bg-primary-pressed disabled:opacity-60"
      >
        Configurar
      </button>
    </>
  );
}
