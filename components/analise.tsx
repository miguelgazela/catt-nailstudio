"use client";

import { Analytics } from "@vercel/analytics/next";

import { limparEvento } from "@/lib/analise";

/** Visitas com o Vercel Web Analytics (sem cookies). Ver lib/analise.ts. */
export function Analise() {
  return <Analytics beforeSend={limparEvento} />;
}
