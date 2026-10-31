import { createHmac } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { type Page } from "@playwright/test";

import { lisboaParaIso } from "../lib/admin/tempo";

export const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(s: string): Buffer {
  let bits = "";
  for (const c of s.replace(/=+$/, "").toUpperCase()) {
    bits += B32.indexOf(c).toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** Código TOTP (RFC 6238, 30 s, 6 dígitos) como o da app autenticadora. */
export function totp(segredo: string, agora = Date.now()): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(agora / 30000)));
  const h = createHmac("sha1", base32(segredo)).update(contador).digest();
  const o = h[h.length - 1] & 0xf;
  const n = (h.readUInt32BE(o) & 0x7fffffff) % 1_000_000;
  return String(n).padStart(6, "0");
}

export async function limparUtilizadores() {
  const c = db();
  const { data } = await c.auth.admin.listUsers();
  for (const u of data.users) await c.auth.admin.deleteUser(u.id);
}

export function linkDe(token: string, next: string) {
  return `/auth/confirmar?token_hash=${token}&type=magiclink&next=${encodeURIComponent(next)}`;
}

/** Cria uma admin com MFA já configurado. Devolve o necessário para entrar. */
export async function criarAdmin(email = "catarina@example.com") {
  const c = db();
  const { data: criada } = await c.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  const id = criada.user!.id;
  await c.from("admins").insert({ user_id: id });
  // Configura o fator TOTP como a Catarina faria, mas por API.
  const { data: link } = await c.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const u = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  await u.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties!.hashed_token,
  });
  const { data: f } = await u.auth.mfa.enroll({ factorType: "totp" });
  const segredo = f!.totp.secret;
  await u.auth.mfa.challengeAndVerify({ factorId: f!.id, code: totp(segredo) });
  return { id, email, segredo };
}

export async function novoLink(email: string, next = "/admin") {
  const { data } = await db().auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  return linkDe(data.properties!.hashed_token, next);
}

/** Entra como admin: link do email + código da app. Acaba no destino. */
export async function entrarAdmin(
  page: Page,
  a: { email: string; segredo: string },
  next = "/admin",
) {
  await page.goto(await novoLink(a.email, next));
  await page.waitForURL(/\/admin\/mfa/);
  await page.getByLabel("Código da app").fill(totp(a.segredo));
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/mfa"));
}

/** Próxima segunda-feira (hora de Lisboa) como "YYYY-MM-DD". */
export function proximaSegunda(): string {
  const hoje = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Lisbon",
  });
  const [a, m, d] = hoje.split("-").map(Number);
  const dow = (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
  return new Date(Date.UTC(a, m - 1, d + (7 - dow) + 7))
    .toISOString()
    .slice(0, 10);
}

/** Cria cliente e marcação confirmada diretamente na BD. */
export async function criarMarcacao(
  dia: string,
  hora: string,
  nome = "Rita Teste",
  tel = "+351912345678",
) {
  const c = db();
  const { data: s } = await c
    .from("services")
    .select("id, price_cents")
    .order("sort_order")
    .limit(1)
    .single();
  let { data: cli } = await c
    .from("clients")
    .select("id")
    .eq("phone", tel)
    .maybeSingle();
  if (!cli)
    ({ data: cli } = await c
      .from("clients")
      .insert({ name: nome, phone: tel })
      .select("id")
      .single());
  const inicio = lisboaParaIso(dia, hora);
  const { data } = await c
    .from("appointments")
    .insert({
      client_id: cli!.id,
      service_id: s!.id,
      starts_at: inicio,
      ends_at: new Date(Date.parse(inicio) + 3600_000).toISOString(),
      price_cents: s!.price_cents,
      origin: "online",
    })
    .select("id")
    .single();
  return { id: data!.id, clienteId: cli!.id };
}

export async function limparDados() {
  const c = db();
  await c.from("appointments").delete().not("id", "is", null);
  await c.from("time_off").delete().not("id", "is", null);
  await c.from("clients").delete().not("id", "is", null);
}
