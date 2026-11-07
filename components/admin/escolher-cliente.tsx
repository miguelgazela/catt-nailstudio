"use client";

import { Search, UserRound } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Campo, classeInput } from "@/components/admin/campos";

export type ClienteLista = { id: string; name: string; phone: string | null };

const MAX_SUGESTOES = 5;

const semAcentos = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/**
 * Escolher uma cliente da lista (pelo nome ou telemóvel) ou escrever um nome novo.
 * Com cliente escolhida vai só o id; sem escolha vão nome, telemóvel e email e a
 * ação cria a ficha (ou usa a que já existir com esse número).
 */
export function EscolherCliente({
  clientes,
  inicial,
  erros,
}: {
  clientes: ClienteLista[];
  inicial?: ClienteLista;
  erros?: { nome?: string; tel?: string; email?: string };
}) {
  const [escolhida, setEscolhida] = useState<ClienteLista | null>(
    inicial ?? null,
  );
  const [texto, setTexto] = useState("");
  const idLista = useId();

  const sugestoes = useMemo(() => {
    const t = semAcentos(texto.trim());
    if (!t) return [];
    const digitos = t.replace(/\D/g, "");
    return clientes
      .filter(
        (c) =>
          semAcentos(c.name).includes(t) ||
          (digitos.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digitos)),
      )
      .slice(0, MAX_SUGESTOES);
  }, [clientes, texto]);

  if (escolhida) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm leading-5 font-semibold">Cliente</span>
        <input type="hidden" name="cliente" value={escolhida.id} />
        <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-primary bg-card px-4 py-2.5">
          <span className="flex min-w-0 flex-col">
            <strong className="truncate text-base">{escolhida.name}</strong>
            {escolhida.phone ? (
              <span className="tabular text-sm text-muted-foreground">
                {escolhida.phone}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => {
              setEscolhida(null);
              setTexto("");
            }}
            className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            Trocar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className="text-sm leading-5 font-semibold">
          Nome da cliente
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="nome"
            name="nome"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoComplete="off"
            aria-invalid={erros?.nome ? true : undefined}
            aria-describedby={`${idLista}-ajuda`}
            placeholder="Procura por nome ou telemóvel"
            className={`${classeInput} pl-12`}
          />
        </div>
        {erros?.nome ? (
          <p className="text-[13px] leading-[18px] text-danger">{erros.nome}</p>
        ) : null}
        <p
          id={`${idLista}-ajuda`}
          className="text-[13px] leading-[18px] text-muted-foreground"
        >
          Escolhe uma cliente da lista. Se ainda não existe, escreve o nome e
          preenche o telemóvel.
        </p>
        {sugestoes.length ? (
          <ul
            aria-label="Clientes encontradas"
            className="flex flex-col overflow-hidden rounded-lg border border-border bg-card"
          >
            {sugestoes.map((c) => (
              <li key={c.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setEscolhida(c)}
                  className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-accent"
                >
                  <UserRound
                    aria-hidden
                    className="size-4 shrink-0 text-primary"
                  />
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">
                    {c.name}
                  </span>
                  {c.phone ? (
                    <span className="tabular text-sm text-muted-foreground">
                      {c.phone}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Campo
        id="tel"
        rotulo="Telemóvel"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        erro={erros?.tel}
        ajuda="Se já existir uma cliente com este número, usamos a ficha dela."
      />
      <Campo
        id="email"
        rotulo="Email (opcional)"
        type="email"
        autoComplete="off"
        erro={erros?.email}
      />
    </div>
  );
}
