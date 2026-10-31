import "server-only";

import webpush from "web-push";

import { supabaseAdmin } from "./supabase/admin";

export type Aviso = { titulo: string; corpo: string; url?: string };

export function pushConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

/**
 * Avisa todos os dispositivos das admins. Sem chaves VAPID não envia nada.
 * Dispositivos que já não existem (404/410) são apagados. Devolve quantos receberam.
 * O conteúdo não leva nomes nem contactos de clientes.
 */
export async function notificarAdmins(
  aviso: Aviso,
  opcoes: { ignorarPreferencia?: boolean } = {},
): Promise<number> {
  if (!pushConfigurado()) return 0;
  const db = supabaseAdmin();
  if (!opcoes.ignorarPreferencia) {
    const { data: s } = await db
      .from("settings")
      .select("notify_on_booking")
      .single();
    if (s && !s.notify_on_booking) return 0;
  }
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (!subs?.length) return 0;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:geral@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  const corpo = JSON.stringify({
    titulo: aviso.titulo,
    corpo: aviso.corpo,
    url: aviso.url ?? "/admin",
  });
  let enviados = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          corpo,
          { TTL: 60 * 60 * 12, urgency: "normal" },
        );
        enviados++;
      } catch (e) {
        const codigo = (e as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) {
          await db.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }),
  );
  return enviados;
}
