"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { type EstadoConta, reservarComConta } from "@/app/marcar/actions";
import { cn } from "@/lib/utils";

import { Aviso, campoTexto } from "./aviso";

const inicial: EstadoConta = {};

export function FormConta({
  servicoId,
  dia,
  hora,
  ficha,
  email,
}: {
  servicoId: string;
  dia: string;
  hora: string;
  ficha: { nome: string; telefone: string | null } | null;
  email: string | null;
}) {
  const [estado, acao, pendente] = useActionState(reservarComConta, inicial);
  const c = estado.campos ?? {};
  // Ficha sem telemóvel (ex.: anonimizada): pede-o aqui.
  const pedeDados = !ficha || !ficha.telefone;

  return (
    <form action={acao} className="flex flex-col gap-[18px]" noValidate>
      <input type="hidden" name="servico" value={servicoId} />
      <input type="hidden" name="dia" value={dia} />
      <input type="hidden" name="hora" value={hora} />
      {estado.erro ? <Aviso>{estado.erro}</Aviso> : null}

      {pedeDados ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nome" className="text-sm font-semibold">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              autoComplete="name"
              required
              defaultValue={ficha?.nome}
              aria-invalid={c.nome ? true : undefined}
              className={campoTexto}
            />
            {c.nome ? (
              <p className="text-[13px] leading-[18px] text-danger">{c.nome}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tel" className="text-sm font-semibold">
              Telemóvel
            </label>
            <input
              id="tel"
              name="tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              aria-invalid={c.tel ? true : undefined}
              className={cn(campoTexto, "tabular")}
            />
            {c.tel ? (
              <p className="text-[13px] leading-[18px] text-danger">{c.tel}</p>
            ) : (
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                Se já marcaste connosco com este número, juntamos as marcações à
                tua conta.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-lg border border-border bg-card px-4 py-3.5 text-[15px] leading-[22px]">
          Marca como <strong>{ficha.nome}</strong>
          <br />
          <span className="tabular text-muted-foreground">
            {ficha.telefone} · {email}
          </span>
          <br />
          <Link
            href="/conta/dados"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Alterar os meus dados
          </Link>
        </p>
      )}

      <p className="text-[13px] leading-[18px] text-muted-foreground">
        Com conta podes ver e cancelar as marcações em &quot;A minha conta&quot;,
        até 24 h antes.
      </p>

      <button
        type="submit"
        disabled={pendente}
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
    </form>
  );
}
