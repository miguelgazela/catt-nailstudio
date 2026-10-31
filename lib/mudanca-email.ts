// Link para confirmar um email novo da conta: token assinado (HMAC) com a pessoa, o email
// novo e a validade. Não fica nada guardado na base. Sem "server-only" para os testes
// poderem gerar o mesmo link; o segredo nunca sai do servidor.
import { createHmac, timingSafeEqual } from "node:crypto";

export const VALIDADE_MS = 60 * 60 * 1000;

function segredo(): string {
  const s =
    process.env.PAINEL_SESSAO_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Segredo em falta");
  return s;
}

// O prefixo separa estas assinaturas das do cookie do painel, que usa o mesmo segredo.
const assinar = (corpo: string) =>
  createHmac("sha256", segredo()).update(`mudar-email:${corpo}`).digest("hex");

export function criarTokenEmail(
  utilizador: string,
  email: string,
  agora = Date.now(),
): string {
  const corpo = Buffer.from(
    JSON.stringify({ u: utilizador, e: email, x: agora + VALIDADE_MS }),
  ).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

export function lerTokenEmail(
  token: string | null | undefined,
  agora = Date.now(),
): { utilizador: string; email: string } | null {
  if (!token) return null;
  const [corpo, sig, ...resto] = token.split(".");
  if (!corpo || !sig || resto.length) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(assinar(corpo));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(corpo, "base64url").toString());
    if (typeof d.u !== "string" || typeof d.e !== "string") return null;
    if (typeof d.x !== "number" || agora > d.x) return null;
    return { utilizador: d.u, email: d.e };
  } catch {
    return null;
  }
}
