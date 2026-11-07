"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opcoes: Record<string, unknown>) => string;
      reset: (id?: string | HTMLElement) => void;
      remove: (id?: string | HTMLElement) => void;
    };
  }
}

// Se não houver token ao fim deste tempo, deixa de parecer "a carregar" e oferece tentar de novo.
const DEMORA_MS = 12_000;

/**
 * Verificação anti-robô (Cloudflare Turnstile). `pronto` é o estado do pai: o botão
 * de enviar fica desativado enquanto for false, e aqui explicamos porquê (a verificar,
 * demora ou erro) com uma forma de tentar outra vez.
 */
export function Turnstile({
  siteKey,
  pronto,
  aoMudar,
}: {
  siteKey: string;
  pronto: boolean;
  aoMudar: (pronto: boolean) => void;
}) {
  const [erro, setErro] = useState(false);
  const [demora, setDemora] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [scriptPronto, setScriptPronto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | null>(null);

  // Desenho explícito: o script só procura `.cf-turnstile` quando carrega, por isso numa
  // navegação sem recarregar (script já carregado) o widget nunca apareceria.
  const montar = useCallback(() => {
    if (!caixa.current || !window.turnstile || idWidget.current) return;
    idWidget.current = window.turnstile.render(caixa.current, {
      sitekey: siteKey,
      language: "pt",
      appearance: "interaction-only",
      callback: () => {
        setErro(false);
        setDemora(false);
        aoMudar(true);
      },
      "expired-callback": () => {
        setDemora(false);
        aoMudar(false);
      },
      "timeout-callback": () => {
        setDemora(false);
        aoMudar(false);
      },
      "error-callback": () => {
        setErro(true);
        aoMudar(false);
      },
    });
  }, [siteKey, aoMudar]);

  useEffect(() => {
    if (!scriptPronto) return;
    montar();
    return () => {
      if (idWidget.current) window.turnstile?.remove(idWidget.current);
      idWidget.current = null;
    };
  }, [scriptPronto, montar]);

  // Sem token: ao fim de DEMORA_MS passa de "a verificar" a "está a demorar".
  useEffect(() => {
    if (pronto || erro) return;
    const t = setTimeout(() => setDemora(true), DEMORA_MS);
    return () => clearTimeout(t);
  }, [pronto, erro, tentativa]);

  function tentarOutraVez() {
    setErro(false);
    setDemora(false);
    aoMudar(false);
    setTentativa((n) => n + 1);
    if (idWidget.current) window.turnstile?.reset(idWidget.current);
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        // onReady também corre sempre que o componente monta com o script já carregado.
        onReady={() => setScriptPronto(true)}
      />
      <div ref={caixa} />
      {erro || (demora && !pronto) ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-1 rounded-lg bg-danger-surface px-4 py-3 text-sm leading-5 text-danger"
        >
          <p className="flex items-start gap-2.5">
            <CircleAlert aria-hidden className="mt-0.5 size-[18px] shrink-0" />
            {erro
              ? "Não conseguimos verificar que és uma pessoa."
              : "A verificação está a demorar mais do que o normal."}
          </p>
          <button
            type="button"
            onClick={tentarOutraVez}
            className="inline-flex min-h-11 items-center pl-7 font-semibold underline underline-offset-4"
          >
            Tentar outra vez
          </button>
        </div>
      ) : !pronto ? (
        <p
          role="status"
          className="flex items-center gap-2 text-[13px] leading-[18px] text-muted-foreground"
        >
          <LoaderCircle aria-hidden className="size-4 animate-spin" />A
          verificar que és uma pessoa…
        </p>
      ) : null}
    </>
  );
}
