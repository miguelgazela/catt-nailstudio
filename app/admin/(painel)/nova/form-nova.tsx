"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { AvisoErro, Campo, botaoPrimario } from "@/components/admin/campos";
import {
  type ClienteLista,
  EscolherCliente,
} from "@/components/admin/escolher-cliente";
import { EscolherHora } from "@/components/admin/escolher-hora";

import { type EstadoForm, criarMarcacao } from "../marcacao/actions";

export function FormNova({
  servicos,
  dia,
  hora,
  cliente,
  clientes,
}: {
  servicos: { id: string; name: string; price_cents: number }[];
  dia: string;
  hora?: string;
  cliente?: ClienteLista;
  clientes: ClienteLista[];
}) {
  const [e, acao, pendente] = useActionState(criarMarcacao, {} as EstadoForm);
  return (
    <form action={acao} noValidate className="flex flex-col gap-[18px]">
      {e.erro ? <AvisoErro>{e.erro}</AvisoErro> : null}
      <EscolherCliente
        clientes={clientes}
        inicial={cliente}
        erros={e.campos}
      />
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-sm leading-5 font-semibold">
          Serviço
        </legend>
        <div className="flex flex-wrap gap-2">
          {servicos.map((s) => (
            <label key={s.id} className="cursor-pointer">
              <input
                type="radio"
                name="servico"
                value={s.id}
                required
                className="peer sr-only"
              />
              <span className="inline-flex min-h-11 items-center rounded-full border border-input bg-card px-4 text-sm font-bold text-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                {s.name}
                <span className="tabular ml-1.5 font-normal opacity-80">
                  {(s.price_cents / 100).toLocaleString("pt-PT", {
                    minimumFractionDigits: 0,
                  })}{" "}
                  €
                </span>
              </span>
            </label>
          ))}
        </div>
        {e.campos?.servico ? (
          <p className="text-[13px] text-danger">{e.campos.servico}</p>
        ) : null}
      </fieldset>
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
