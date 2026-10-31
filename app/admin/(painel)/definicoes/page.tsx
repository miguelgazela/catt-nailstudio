import { exigirAdmin } from "@/lib/auth";
import { supabaseSessao } from "@/lib/supabase/sessao";

import { FormDefinicoes } from "./form-definicoes";
import { Notificacoes } from "./notificacoes";

export default async function Definicoes() {
  await exigirAdmin("/admin/definicoes");
  const sb = await supabaseSessao();
  const { data } = await sb
    .from("settings")
    .select(
      "min_notice_minutes, max_advance_days, cancel_window_hours, contact_phone, contact_email, address, instagram, policy_text, notify_on_booking",
    )
    .single();
  if (!data) return <p>Não foi possível ler as definições.</p>;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="font-display text-[32px] leading-9 font-semibold">
        Definições
      </h1>
      <Notificacoes
        chavePublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
      />
      <FormDefinicoes d={data} />
    </main>
  );
}
