"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Barra fina no topo enquanto a página seguinte não chega. Cobre o que o loading.tsx não
 * cobre: mudanças só nos parâmetros (passos do /marcar, dias da agenda, filtros), em que o
 * Next fica na página antiga até o servidor responder. Aparece no toque e sai quando o
 * endereço muda.
 */
export function BarraNavegacao() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [ativa, setAtiva] = useState(false);

  // Endereço novo: a navegação acabou.
  useEffect(() => {
    queueMicrotask(() => setAtiva(false));
  }, [pathname, params]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      // Sem olhar para defaultPrevented: o <Link> do Next cancela sempre o clique para navegar.
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const destino = new URL(a.href, location.href);
      if (destino.origin !== location.origin) return;
      // Mesmo endereço (ou só a âncora): não há navegação.
      if (
        destino.pathname === location.pathname &&
        destino.search === location.search
      )
        return;
      setAtiva(true);
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  if (!ativa) return null;
  return (
    <div
      aria-hidden
      data-barra-navegacao
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px] overflow-hidden"
    >
      <div className="barra-navegacao h-full bg-primary" />
    </div>
  );
}
