"use client";

import { CircleAlert, LoaderCircle, MailCheck } from "lucide-react";
import { useActionState, useCallback, useState } from "react";

import { Turnstile } from "@/components/marca/turnstile";

import {
  type EstadoCodigo,
  type EstadoEntrar,
  entrarComCodigo,
  pedirLink,
} from "./actions";

const inicial: EstadoEntrar = {};
const inicialCodigo: EstadoCodigo = {};

function FormCodigo({ email, destino }: { email: string; destino: string }) {
  const [estado, acao, pendente] = useActionState(
    entrarComCodigo,
    inicialCodigo,
  );
  return (
    <form action={acao} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
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
          Código do email
        </label>
        <input
          id="codigo"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={12}
          required
          className="tabular min-h-12 w-full rounded-md border border-input bg-card px-4 text-center text-xl tracking-[0.3em] text-foreground"
        />
        <p className="text-[13px] leading-[18px] text-muted-foreground">
          Na app instalada no telemóvel, o link abre noutro browser. Escreve
          aqui o código para entrar na app.
        </p>
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground transition-colors hover:bg-primary-pressed disabled:opacity-60"
      >
        {pendente ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
        ) : null}
        Entrar com o código
      </button>
    </form>
  );
}

export function FormEntrar({
  siteKey,
  destino,
  criarConta = true,
}: {
  siteKey: string;
  destino: string;
  criarConta?: boolean;
}) {
  const [pronto, setPronto] = useState(false);
  const aoMudar = useCallback((p: boolean) => setPronto(p), []);
  const [estado, acao, pendente] = useActionState(
    async (anterior: EstadoEntrar, dados: FormData) => {
      const r = await pedirLink(anterior, dados);
      setPronto(false);
      window.turnstile?.reset();
      return r;
    },
    inicial,
  );

  if (estado.enviado) {
    return (
      <div className="flex flex-col gap-5">
        <div
          role="status"
          className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-5"
        >
          <MailCheck aria-hidden className="size-7 text-success" />
          <p className="text-base leading-6">
            Se o email estiver certo, enviámos-te um link e um código para
            entrar. Carrega em &quot;Entrar&quot; no email, ou escreve o código
            aqui em baixo.
          </p>
          <p className="text-sm leading-5 text-muted-foreground">
            Não chegou? Vê o spam e, passados uns minutos, volta a pedir.
          </p>
        </div>
        <FormCodigo email={estado.email ?? ""} destino={destino} />
      </div>
    );
  }

  return (
    <form action={acao} noValidate className="flex flex-col gap-[18px]">
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
        <label htmlFor="email" className="text-sm leading-5 font-semibold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={estado.email}
          aria-invalid={estado.campoEmail ? true : undefined}
          aria-describedby={estado.campoEmail ? "email-erro" : "email-ajuda"}
          placeholder="nome@exemplo.pt"
          className="min-h-12 w-full rounded-md border border-input bg-card px-4 text-base text-foreground placeholder:text-muted-foreground aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive"
        />
        {estado.campoEmail ? (
          <p id="email-erro" className="text-[13px] leading-[18px] text-danger">
            {estado.campoEmail}
          </p>
        ) : (
          <p
            id="email-ajuda"
            className="text-[13px] leading-[18px] text-muted-foreground"
          >
            {criarConta
              ? "Enviamos um link e um código para entrar. Se for a primeira vez, a conta é criada nesse momento. Não precisas de palavra-passe."
              : "Enviamos um link e um código para entrar. Não precisas de palavra-passe."}
          </p>
        )}
      </div>
      <Turnstile siteKey={siteKey} pronto={pronto} aoMudar={aoMudar} />
      <button
        type="submit"
        disabled={pendente || !pronto}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-bold text-primary-foreground transition-colors hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente ? (
          <>
            <LoaderCircle aria-hidden className="size-5 animate-spin" />A enviar
          </>
        ) : (
          "Enviar link"
        )}
      </button>
    </form>
  );
}
