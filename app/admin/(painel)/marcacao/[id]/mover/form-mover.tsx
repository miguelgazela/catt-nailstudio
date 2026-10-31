"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { AvisoErro, botaoPrimario } from "@/components/admin/campos";
import { EscolherHora } from "@/components/admin/escolher-hora";

import { type EstadoForm, moverMarcacao } from "../../actions";

export function FormMover({
  id,
  dia,
  hora,
}: {
  id: string;
  dia: string;
  hora: string;
}) {
  const [e, acao, pendente] = useActionState(moverMarcacao, {} as EstadoForm);
  return (
    <form action={acao} noValidate className="flex flex-col gap-[18px]">
      <input type="hidden" name="id" value={id} />
      {e.erro ? <AvisoErro>{e.erro}</AvisoErro> : null}
      <EscolherHora
        diaInicial={dia}
        horaInicial={hora}
        excluirId={id}
        erro={e.campos?.hora ?? e.campos?.dia}
      />
      <button type="submit" disabled={pendente} className={botaoPrimario}>
        {pendente ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
        ) : null}
        Mover marcação
      </button>
    </form>
  );
}
