"use client";

import { Download, Share, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/marca/logo";

// Páginas onde a cliente está à vontade para ver o convite (nunca a meio de uma marcação nem no painel).
const PAGINAS = ["/", "/conta", "/marcar/confirmada"];
const CHAVE = "cn-instalar-dispensado";
const SILENCIO_MS = 30 * 24 * 60 * 60 * 1000;
const ATRASO_MS = 3500;

type EventoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function jaDispensado(): boolean {
  try {
    const t = Number(localStorage.getItem(CHAVE));
    return t > 0 && Date.now() - t < SILENCIO_MS;
  } catch {
    return false;
  }
}

function lembrarDispensa() {
  try {
    localStorage.setItem(CHAVE, String(Date.now()));
  } catch {}
}

function emApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function emIos(): boolean {
  // iPadOS diz que é um Mac, mas só ele tem ecrã tátil.
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// Browser interno do Instagram/Facebook: não deixa instalar, é preciso abrir no browser a sério.
function emBrowserInterno(): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB/.test(navigator.userAgent);
}

// Convite discreto para pôr a página no ecrã principal. iPhone: instruções (a Apple não deixa
// instalar por botão). Android/Chrome: botão que abre o diálogo nativo. Desktop: nada.
export function AvisoInstalar() {
  const caminho = usePathname();
  const [modo, setModo] = useState<"ios" | "android" | "interno" | null>(null);
  const [aberto, setAberto] = useState(false);
  const [evento, setEvento] = useState<EventoInstalar | null>(null);

  useEffect(() => {
    if (!PAGINAS.includes(caminho) || emApp() || jaDispensado()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const mostrar = (m: "ios" | "android" | "interno") => {
      setModo(m);
      timer = setTimeout(() => setAberto(true), ATRASO_MS);
    };

    function aoPedir(e: Event) {
      e.preventDefault();
      setEvento(e as EventoInstalar);
      clearTimeout(timer);
      mostrar("android");
    }
    function aoInstalar() {
      lembrarDispensa();
      setAberto(false);
    }

    if (emBrowserInterno()) mostrar("interno");
    else if (emIos()) mostrar("ios");
    window.addEventListener("beforeinstallprompt", aoPedir);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", aoPedir);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, [caminho]);

  if (!aberto || !modo || !PAGINAS.includes(caminho)) return null;

  function fechar() {
    lembrarDispensa();
    setAberto(false);
  }

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice.catch(() => null);
    fechar();
  }

  return (
    <div
      role="dialog"
      aria-label="Instalar a aplicação"
      className="aviso-instalar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-border bg-card py-4 pr-2 pl-4 text-card-foreground shadow-card"
    >
      <Logo size={44} />
      <div className="flex-1 text-sm leading-5">
        <p className="font-display text-xl leading-6 font-semibold">
          Guarda no ecrã principal
        </p>
        {modo === "interno" ? (
          <p className="mt-0.5 text-muted-foreground">
            Para guardares como app, abre esta página no{" "}
            {emIos() ? "Safari" : "Chrome"}: toca nos três pontos (⋯) e
            escolhe «Abrir no browser».
          </p>
        ) : modo === "ios" ? (
          <p className="mt-0.5 text-muted-foreground">
            Toca em Partilhar{" "}
            <Share
              aria-label="ícone Partilhar"
              role="img"
              className="inline size-4 -translate-y-px text-primary"
            />{" "}
            e depois em «Adicionar ao ecrã principal». Marcas mais depressa e
            abre como uma app.
          </p>
        ) : (
          <>
            <p className="mt-0.5 text-muted-foreground">
              Marca à tua hora mais depressa, abre como uma app.
            </p>
            <button
              type="button"
              onClick={instalar}
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground hover:bg-primary-pressed"
            >
              <Download aria-hidden className="size-4" />
              Instalar
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        aria-label="Fechar"
        onClick={fechar}
        className="flex size-11 shrink-0 items-center justify-center text-muted-foreground"
      >
        <X aria-hidden className="size-5" />
      </button>
    </div>
  );
}
