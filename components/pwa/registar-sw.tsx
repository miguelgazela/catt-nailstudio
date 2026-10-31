"use client";

import { useEffect } from "react";

// Regista o service worker em todo o site: serve as notificações do painel e a página offline.
// O sw.js não guarda páginas em cache (só a página offline), por isso nunca mostra dados antigos.
export function RegistarSw() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
