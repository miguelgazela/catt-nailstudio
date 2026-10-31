"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { botaoPrimario, botaoSecundario } from "@/components/admin/campos";

import {
  enviarTeste,
  guardarSubscricao,
  removerSubscricao,
} from "./push-actions";

type Estado =
  "a-ver" | "sem-suporte" | "sem-chaves" | "negado" | "desligado" | "ligado";

function chaveParaBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function Notificacoes({
  chavePublica,
}: {
  chavePublica: string | null;
}) {
  const [estado, setEstado] = useState<Estado>("a-ver");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    (async () => {
      if (!chavePublica) return setEstado("sem-chaves");
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        return setEstado("sem-suporte");
      }
      if (Notification.permission === "denied") return setEstado("negado");
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const s = await reg?.pushManager.getSubscription();
      setEstado(s ? "ligado" : "desligado");
    })().catch(() => setEstado("sem-suporte"));
  }, [chavePublica]);

  function ativar() {
    iniciar(async () => {
      setMsg(null);
      try {
        const permissao = await Notification.requestPermission();
        if (permissao !== "granted")
          return setEstado(permissao === "denied" ? "negado" : "desligado");
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chaveParaBytes(chavePublica!),
        });
        const r = await guardarSubscricao(sub.toJSON(), navigator.userAgent);
        if (!r.ok) throw new Error("guardar");
        setEstado("ligado");
      } catch {
        setMsg("Não foi possível ativar. Tente outra vez.");
      }
    });
  }

  function desativar() {
    iniciar(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const s = await reg?.pushManager.getSubscription();
      if (s) {
        await removerSubscricao(s.endpoint);
        await s.unsubscribe();
      }
      setEstado("desligado");
      setMsg(null);
    });
  }

  function testar() {
    iniciar(async () => {
      const r = await enviarTeste();
      setMsg(
        r.enviados > 0
          ? "Teste enviado. Deve aparecer já."
          : "Nada enviado. Confirme as chaves e este telemóvel.",
      );
    });
  }

  return (
    <section
      aria-labelledby="notif"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 id="notif" className="flex items-center gap-2 text-xl font-bold">
        <Bell aria-hidden className="size-5" /> Notificações neste telemóvel
      </h2>
      {estado === "a-ver" ? (
        <p className="text-sm text-muted-foreground">A verificar…</p>
      ) : null}
      {estado === "sem-chaves" ? (
        <p className="text-sm text-muted-foreground">
          As notificações ainda não estão configuradas no servidor.
        </p>
      ) : null}
      {estado === "sem-suporte" ? (
        <p className="text-sm text-muted-foreground">
          Este browser não suporta notificações. No iPhone, instale primeiro a
          app no ecrã inicial (Partilhar › Adicionar ao ecrã inicial) e abra-a a
          partir de lá.
        </p>
      ) : null}
      {estado === "negado" ? (
        <p className="flex items-start gap-2 text-sm text-danger">
          <BellOff aria-hidden className="mt-0.5 size-4 shrink-0" />
          As notificações estão bloqueadas. Ative-as nas definições do telemóvel
          para este site.
        </p>
      ) : null}
      {estado === "desligado" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Receba um aviso quando uma cliente marcar ou cancelar.
          </p>
          <button
            type="button"
            onClick={ativar}
            disabled={pendente}
            className={botaoPrimario}
          >
            Ativar notificações
          </button>
        </>
      ) : null}
      {estado === "ligado" ? (
        <>
          <p className="text-sm text-success">Ativas neste telemóvel.</p>
          <button
            type="button"
            onClick={testar}
            disabled={pendente}
            className={botaoSecundario}
          >
            Enviar teste
          </button>
          <button
            type="button"
            onClick={desativar}
            disabled={pendente}
            className={botaoSecundario}
          >
            Desativar neste telemóvel
          </button>
        </>
      ) : null}
      {msg ? (
        <p role="status" className="text-sm">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
