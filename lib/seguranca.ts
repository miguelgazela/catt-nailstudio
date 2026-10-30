import "server-only";

import { createHash } from "node:crypto";

import { supabaseAdmin } from "./supabase/admin";

function hash(valor: string): string {
  const sal = process.env.RATE_LIMIT_SALT;
  if (!sal && process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_SALT em falta");
  }
  return createHash("sha256")
    .update(`${sal ?? "dev"}:${valor}`)
    .digest("hex");
}

/** true = permitido. Guarda só um hash com sal; o IP e o telemóvel nunca ficam em claro. */
export async function permitido(
  chave: string,
  max: number,
  janelaSegundos: number,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("rate_limit_hit", {
    p_key: hash(chave),
    p_limit: max,
    p_window_seconds: janelaSegundos,
  });
  // Se o limitador falhar, não bloqueia a cliente: o Turnstile e a BD continuam a proteger.
  return error ? true : data === true;
}

export async function verificarTurnstile(
  token: string,
  ip?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;
  const corpo = new URLSearchParams({ secret, response: token });
  if (ip) corpo.set("remoteip", ip);
  try {
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: corpo },
    );
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}
