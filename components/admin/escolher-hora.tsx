"use client";

import { useEffect, useState } from "react";

import {
  type HoraDoDia,
  horasDoDia,
} from "@/app/admin/(painel)/marcacao/actions";

// Escolha de dia e hora para marcar ou mover. A hora vem do horário; "Fora do horário"
// deixa escrever qualquer hora (a BD só impede duas marcações ao mesmo tempo).
export function EscolherHora({
  diaInicial,
  horaInicial,
  excluirId,
  erro,
}: {
  diaInicial: string;
  horaInicial?: string;
  excluirId?: string;
  erro?: string;
}) {
  const [dia, setDia] = useState(diaInicial);
  const [horas, setHoras] = useState<HoraDoDia[] | null>(null);
  const [fora, setFora] = useState(false);

  useEffect(() => {
    let atual = true;
    if (!dia) return;
    horasDoDia(dia, excluirId).then((h) => atual && setHoras(h));
    return () => {
      atual = false;
    };
  }, [dia, excluirId]);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-semibold">Dia e hora</legend>
      <input
        type="date"
        name="dia"
        required
        value={dia}
        onChange={(e) => {
          setHoras(null);
          setDia(e.target.value);
        }}
        aria-label="Dia"
        className="min-h-12 w-full rounded-md border border-input bg-card px-4 text-base"
      />
      {!fora ? (
        horas === null ? (
          <p className="text-sm text-muted-foreground">A carregar horas…</p>
        ) : horas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem horário neste dia. Use “Fora do horário”.
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Hora"
            className="grid grid-cols-3 gap-2"
          >
            {horas.map((h) => (
              <label
                key={h.hora}
                className={`flex min-h-12 items-center justify-center rounded-md border text-base font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground ${
                  h.estado === "livre"
                    ? "border-input bg-card"
                    : "border-border bg-muted text-muted-foreground line-through"
                }`}
              >
                <input
                  type="radio"
                  name="hora"
                  value={h.hora}
                  disabled={h.estado !== "livre"}
                  defaultChecked={
                    h.hora === horaInicial && h.estado === "livre"
                  }
                  className="sr-only"
                />
                <span className="tabular">{h.hora}</span>
              </label>
            ))}
          </div>
        )
      ) : (
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Hora (1 hora de duração)
          <input
            type="time"
            name="horaLivre"
            required
            defaultValue={horaInicial}
            className="tabular min-h-12 w-full rounded-md border border-input bg-card px-4 text-base font-normal"
          />
        </label>
      )}
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input
          type="checkbox"
          name="fora"
          checked={fora}
          onChange={(e) => setFora(e.target.checked)}
          className="size-5 accent-[var(--primary)]"
        />
        Fora do horário
      </label>
      {erro ? (
        <p role="alert" className="text-[13px] leading-[18px] text-danger">
          {erro}
        </p>
      ) : null}
    </fieldset>
  );
}
