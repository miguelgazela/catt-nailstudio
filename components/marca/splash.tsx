"use client";

import { useEffect } from "react";

import { Logo } from "./logo";

// Ecrã de abertura só no arranque a frio (uma vez por sessão). Sai logo que a página
// está pronta: não atrasa nada de propósito. Sem JS, uma animação CSS esconde-o ao fim de 2 s.
export function Splash() {
  useEffect(() => {
    const el = document.getElementById("splash");
    if (!el) return;
    try {
      sessionStorage.setItem("cn-splash", "1");
    } catch {}
    // Só esconde (nunca remove o nó: o React é dono dele e falharia ao sair da página).
    el.classList.add("splash-saiu");
  }, []);

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("cn-splash"))document.documentElement.classList.add("sem-splash")}catch(e){}`,
        }}
      />
      <div
        id="splash"
        role="status"
        aria-label="A carregar"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background"
      >
        <Logo
          size={160}
          alt="Catarina Neves Nails Studio"
          priority
          className="rounded-[32px] shadow-card"
        />
        <p
          aria-hidden
          className="font-display text-[40px] leading-none font-semibold"
        >
          Catarina Neves
        </p>
        <span aria-hidden className="flex gap-2">
          <span className="splash-ponto" />
          <span className="splash-ponto" />
          <span className="splash-ponto" />
        </span>
      </div>
    </>
  );
}
