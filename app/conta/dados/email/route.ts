import { NextResponse } from "next/server";

import { enviarEmail } from "@/lib/email/enviar";
import { urlDoSite } from "@/lib/email/marcacao";
import { emailEmailMudado } from "@/lib/email/modelos";
import { lerTokenEmail } from "@/lib/mudanca-email";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseSessao } from "@/lib/supabase/sessao";

export const dynamic = "force-dynamic";

// Link do email de confirmação: muda o email da conta e da ficha e avisa o email antigo.
// O token é a prova (funciona noutro browser); a sessão, se for da mesma pessoa, é renovada.
export async function GET(pedido: Request) {
  const url = new URL(pedido.url);
  const ir = (q: string) =>
    NextResponse.redirect(new URL(`/conta/dados?${q}`, url.origin));
  const t = lerTokenEmail(url.searchParams.get("t"));
  if (!t) return ir("erro=link-email");

  const db = supabaseAdmin();
  const { data: atual } = await db.auth.admin.getUserById(t.utilizador);
  if (!atual?.user) return ir("erro=link-email");
  const antigo = atual.user.email ?? null;
  if (antigo?.toLowerCase() === t.email) return ir("email=mudado");

  const { error } = await db.auth.admin.updateUserById(t.utilizador, {
    email: t.email,
    email_confirm: true,
  });
  // Normalmente: o email já é de outra conta. Quem chega aqui é dono desse email, por isso pode saber.
  if (error) return ir("erro=email-uso");
  await db
    .from("clients")
    .update({ email: t.email })
    .eq("user_id", t.utilizador);

  if (antigo) {
    const { data: s } = await db
      .from("settings")
      .select("contact_phone")
      .single();
    await enviarEmail({
      para: antigo,
      ...emailEmailMudado({
        novoEmail: t.email,
        siteUrl: urlDoSite(),
        telefone: s?.contact_phone,
      }),
    });
  }

  // Renova a sessão para o email novo aparecer já (o token antigo ainda trazia o anterior).
  const sb = await supabaseSessao();
  const { data: c } = await sb.auth.getClaims();
  if (c?.claims?.sub === t.utilizador) await sb.auth.refreshSession();
  return ir("email=mudado");
}
