// Sessão do painel: além do login com MFA, o painel só fica aberto durante um tempo.
// Cookie assinado (HMAC) com o início e a última atividade. Não tem "server-only"
// porque o proxy também o usa; o segredo nunca sai do servidor.
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_PAINEL = "painel";
/** Fecha após 4 h sem usar. */
export const INATIVIDADE_MS = 4 * 60 * 60 * 1000;
/** Fecha sempre 12 h depois de verificar o código, mesmo em uso. */
export const MAXIMO_MS = 12 * 60 * 60 * 1000;

function segredo(): string {
  const s =
    process.env.PAINEL_SESSAO_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("PAINEL_SESSAO_SECRET em falta");
  return s;
}

function assinar(corpo: string): string {
  return createHmac("sha256", segredo()).update(corpo).digest("hex");
}

export function criarCookiePainel(
  utilizador: string,
  inicio = Date.now(),
  ultimo = inicio,
): string {
  const corpo = `${utilizador}.${inicio}.${ultimo}`;
  return `${corpo}.${assinar(corpo)}`;
}

export type SessaoPainel = {
  utilizador: string;
  inicio: number;
  ultimo: number;
};

/** Devolve a sessão se a assinatura estiver certa e ainda não tiver expirado. */
export function lerCookiePainel(
  valor: string | undefined,
  agora = Date.now(),
): SessaoPainel | null {
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 4) return null;
  const [utilizador, i, u, sig] = partes;
  const esperado = assinar(`${utilizador}.${i}.${u}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const inicio = Number(i);
  const ultimo = Number(u);
  if (!Number.isFinite(inicio) || !Number.isFinite(ultimo)) return null;
  if (agora - inicio > MAXIMO_MS || agora - ultimo > INATIVIDADE_MS)
    return null;
  return { utilizador, inicio, ultimo };
}

export const opcoesCookiePainel = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAXIMO_MS / 1000,
};
