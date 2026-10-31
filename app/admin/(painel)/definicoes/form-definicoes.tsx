"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import {
  AvisoErro,
  Campo,
  botaoPrimario,
  classeInput,
} from "@/components/admin/campos";

import { type EstadoDefinicoes, guardarDefinicoes } from "./actions";

export type Definicoes = {
  min_notice_minutes: number;
  max_advance_days: number;
  cancel_window_hours: number;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  instagram: string | null;
  policy_text: string;
  notify_on_booking: boolean;
};

export function FormDefinicoes({ d }: { d: Definicoes }) {
  const [e, acao, pendente] = useActionState(
    guardarDefinicoes,
    {} as EstadoDefinicoes,
  );
  return (
    <form action={acao} noValidate className="flex flex-col gap-[18px]">
      {e.erro ? <AvisoErro>{e.erro}</AvisoErro> : null}
      {e.ok ? (
        <p
          role="status"
          className="rounded-lg bg-success-surface px-4 py-3 text-sm text-success"
        >
          Definições guardadas.
        </p>
      ) : null}

      <h2 className="text-xl font-bold">Marcações</h2>
      <Campo
        id="aviso_horas"
        rotulo="Antecedência mínima (horas)"
        inputMode="numeric"
        defaultValue={Math.round(d.min_notice_minutes / 60)}
        erro={e.campos?.aviso_horas}
        ajuda="As clientes só marcam daqui a, pelo menos, este tempo."
      />
      <Campo
        id="max_dias"
        rotulo="Antecedência máxima (dias)"
        inputMode="numeric"
        defaultValue={d.max_advance_days}
        erro={e.campos?.max_dias}
        ajuda="Até quantos dias à frente se pode marcar."
      />
      <Campo
        id="cancelar_horas"
        rotulo="Prazo para cancelar (horas antes)"
        inputMode="numeric"
        defaultValue={d.cancel_window_hours}
        erro={e.campos?.cancelar_horas}
        ajuda="A cliente cancela sozinha até este prazo. Depois, tem de a contactar."
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="politica" className="text-sm font-semibold">
          Texto da política
        </label>
        <textarea
          id="politica"
          name="politica"
          rows={5}
          maxLength={3000}
          defaultValue={d.policy_text}
          className={`${classeInput} py-3`}
        />
        {e.campos?.politica ? (
          <p className="text-[13px] text-danger">{e.campos.politica}</p>
        ) : null}
      </div>

      <h2 className="pt-2 text-xl font-bold">Contactos</h2>
      <Campo
        id="telefone"
        rotulo="Telemóvel"
        type="tel"
        inputMode="tel"
        defaultValue={d.contact_phone ?? ""}
        erro={e.campos?.telefone}
      />
      <Campo
        id="email"
        rotulo="Email"
        type="email"
        defaultValue={d.contact_email ?? ""}
        erro={e.campos?.email}
      />
      <Campo
        id="morada"
        rotulo="Morada"
        defaultValue={d.address ?? ""}
        erro={e.campos?.morada}
      />
      <Campo
        id="instagram"
        rotulo="Instagram"
        defaultValue={d.instagram ?? ""}
        erro={e.campos?.instagram}
        ajuda="Só o nome, sem o @."
      />

      <h2 className="pt-2 text-xl font-bold">Avisos</h2>
      <label className="flex min-h-11 items-start gap-3 text-base">
        <input
          type="checkbox"
          name="avisos"
          defaultChecked={d.notify_on_booking}
          className="mt-0.5 size-5 accent-[var(--primary)]"
        />
        Receber notificação quando há uma marcação nova ou cancelada
      </label>

      <button type="submit" disabled={pendente} className={botaoPrimario}>
        {pendente ? (
          <LoaderCircle aria-hidden className="size-5 animate-spin" />
        ) : null}
        Guardar definições
      </button>
    </form>
  );
}
