"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import {
  AvisoErro,
  Campo,
  botaoPrimario,
  classeInput,
} from "@/components/admin/campos";

import { type EstadoCliente, guardarCliente } from "../actions";

export function FormCliente({
  cliente,
}: {
  cliente: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  };
}) {
  const [e, acao, pendente] = useActionState(
    guardarCliente,
    {} as EstadoCliente,
  );
  return (
    <form action={acao} noValidate className="flex flex-col gap-[18px]">
      <input type="hidden" name="id" value={cliente.id} />
      {e.erro ? <AvisoErro>{e.erro}</AvisoErro> : null}
      {e.ok ? (
        <p
          role="status"
          className="rounded-lg bg-success-surface px-4 py-3 text-sm text-success"
        >
          Ficha guardada.
        </p>
      ) : null}
      <Campo
        id="nome"
        rotulo="Nome"
        defaultValue={cliente.name}
        erro={e.campos?.nome}
      />
      <Campo
        id="tel"
        rotulo="Telemóvel"
        type="tel"
        inputMode="tel"
        defaultValue={cliente.phone ?? ""}
        erro={e.campos?.tel}
      />
      <Campo
        id="email"
        rotulo="Email"
        type="email"
        defaultValue={cliente.email ?? ""}
        erro={e.campos?.email}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notas" className="text-sm font-semibold">
          Notas
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={4}
          maxLength={1000}
          defaultValue={cliente.notes ?? ""}
          aria-describedby="notas-aviso"
          className={`${classeInput} py-3`}
        />
        <p
          id="notas-aviso"
          className="rounded-md bg-warning-surface px-3 py-2 text-[13px] leading-[18px] text-warning"
        >
          Só preferências (formato, cores, horários). Não registe alergias nem
          dados de saúde.
        </p>
        {e.campos?.notas ? (
          <p className="text-[13px] text-danger">{e.campos.notas}</p>
        ) : null}
      </div>
      <button type="submit" disabled={pendente} className={botaoPrimario}>
        {pendente ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
        ) : null}
        Guardar ficha
      </button>
    </form>
  );
}
