"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import {
  AvisoErro,
  Campo,
  botaoPrimario,
  classeInput,
} from "@/components/admin/campos";
import { EscolherHora } from "@/components/admin/escolher-hora";

import { type EstadoForm, criarMarcacao } from "../marcacao/actions";

export function FormNova({
  servicos,
  dia,
  hora,
  cliente,
}: {
  servicos: { id: string; name: string; price_cents: number }[];
  dia: string;
  hora?: string;
  cliente?: { id: string; name: string };
}) {
  const [e, acao, pendente] = useActionState(criarMarcacao, {} as EstadoForm);
  return (
    <form action={acao} noValidate className="flex flex-col gap-[18px]">
      {e.erro ? <AvisoErro>{e.erro}</AvisoErro> : null}
      {cliente ? (
        <>
          <input type="hidden" name="cliente" value={cliente.id} />
          <p className="rounded-lg bg-secondary px-4 py-3 text-base">
            Cliente: <strong>{cliente.name}</strong>
          </p>
        </>
      ) : (
        <>
          <Campo
            id="nome"
            rotulo="Nome"
            autoComplete="off"
            erro={e.campos?.nome}
          />
          <Campo
            id="tel"
            rotulo="Telemóvel"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            erro={e.campos?.tel}
            ajuda="Se já existir uma cliente com este número, usa a ficha dela."
          />
          <Campo
            id="email"
            rotulo="Email (opcional)"
            type="email"
            autoComplete="off"
            erro={e.campos?.email}
          />
        </>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="servico" className="text-sm font-semibold">
          Serviço
        </label>
        <select
          id="servico"
          name="servico"
          required
          defaultValue=""
          aria-invalid={e.campos?.servico ? true : undefined}
          className={classeInput}
        >
          <option value="" disabled>
            Escolha o serviço
          </option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ·{" "}
              {(s.price_cents / 100).toLocaleString("pt-PT", {
                minimumFractionDigits: 0,
              })}{" "}
              €
            </option>
          ))}
        </select>
        {e.campos?.servico ? (
          <p className="text-[13px] text-danger">{e.campos.servico}</p>
        ) : null}
      </div>
      <EscolherHora
        diaInicial={dia}
        horaInicial={hora}
        erro={e.campos?.hora ?? e.campos?.dia}
      />
      <Campo
        id="nota"
        rotulo="Nota (opcional)"
        maxLength={500}
        ajuda="Por exemplo: marcou pelo Instagram."
      />
      <button type="submit" disabled={pendente} className={botaoPrimario}>
        {pendente ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
        ) : null}
        Guardar marcação
      </button>
    </form>
  );
}
