"use server";

import { z } from "zod";

import { exigirAdmin } from "@/lib/auth";
import { notificarAdmins } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseSessao } from "@/lib/supabase/sessao";

const sub = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

// Grava com a chave de serviço: o upsert precisa de UPDATE, que o RLS não dá às admins.
// Seguro porque exigirAdmin já confirmou quem é, e o user_id vem da sessão, não do browser.
export async function guardarSubscricao(bruta: unknown, agente: string) {
  const u = await exigirAdmin("/admin/definicoes");
  const p = sub.safeParse(bruta);
  if (!p.success) return { ok: false as const };
  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: u.id,
        endpoint: p.data.endpoint,
        p256dh: p.data.keys.p256dh,
        auth: p.data.keys.auth,
        user_agent: agente.slice(0, 200),
      },
      { onConflict: "endpoint" },
    );
  return { ok: !error };
}

export async function removerSubscricao(endpoint: string) {
  await exigirAdmin("/admin/definicoes");
  const sb = await supabaseSessao();
  await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true as const };
}

export async function enviarTeste() {
  await exigirAdmin("/admin/definicoes");
  const n = await notificarAdmins(
    {
      titulo: "Teste",
      corpo: "As notificações estão a funcionar.",
      url: "/admin",
    },
    { ignorarPreferencia: true },
  );
  return { enviados: n };
}
