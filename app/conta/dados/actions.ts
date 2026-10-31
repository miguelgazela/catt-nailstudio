"use server";

import { redirect } from "next/navigation";

import { exigirCliente } from "@/lib/auth";
import { urlDoSite } from "@/lib/email/marcacao";
import { enviarEmail } from "@/lib/email/enviar";
import { emailConfirmarNovoEmail } from "@/lib/email/modelos";
import { criarTokenEmail } from "@/lib/mudanca-email";
import { permitido } from "@/lib/seguranca";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseSessao } from "@/lib/supabase/sessao";
import { normalizarTelemovel } from "@/lib/telemovel";

const DADOS = "/conta/dados";

export async function guardarDados(formData: FormData) {
  const u = await exigirCliente(DADOS);
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = normalizarTelemovel(String(formData.get("tel") ?? ""));

  if (!nome || nome.length > 100) redirect(`${DADOS}?erro=nome`);
  if (!telefone) redirect(`${DADOS}?erro=tel`);
  if (!(await permitido(`dados:${u.id}`, 10, 600))) {
    redirect(`${DADOS}?erro=limite`);
  }

  const { data, error } = await supabaseAdmin()
    .from("clients")
    .update({ name: nome, phone: telefone })
    .eq("user_id", u.id)
    .select("id");
  // 23505: o número já é de outra ficha. Não dizemos de quem.
  if (error?.code === "23505") redirect(`${DADOS}?erro=numero`);
  if (error || !data?.length) redirect(`${DADOS}?erro=geral`);
  redirect(`${DADOS}?guardado=1`);
}

export async function apagarConta() {
  const u = await exigirCliente(DADOS);
  if (!(await permitido(`apagar:${u.id}`, 5, 600))) {
    redirect(`${DADOS}?erro=limite`);
  }

  const db = supabaseAdmin();
  const { data } = await db.rpc("delete_my_data", { p_user_id: u.id });
  if (!(data as { ok?: boolean } | null)?.ok) redirect(`${DADOS}?erro=geral`);
  const { error } = await db.auth.admin.deleteUser(u.id);
  if (error) redirect(`${DADOS}?erro=geral`);

  const sb = await supabaseSessao();
  await sb.auth.signOut({ scope: "local" });
  redirect("/conta/apagada");
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Envia um link de confirmação para o email novo. O email só muda quando a pessoa o abre. */
export async function pedirMudancaEmail(formData: FormData) {
  const u = await exigirCliente(DADOS);
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) redirect(`${DADOS}?erro=email`);
  if (email === u.email?.toLowerCase()) redirect(`${DADOS}?erro=email-igual`);
  if (!(await permitido(`mudar-email:${u.id}`, 3, 600))) {
    redirect(`${DADOS}?erro=limite`);
  }
  const link = `${urlDoSite()}/conta/dados/email?t=${encodeURIComponent(criarTokenEmail(u.id, email))}`;
  const ok = await enviarEmail({
    para: email,
    ...emailConfirmarNovoEmail({ link, siteUrl: urlDoSite() }),
  });
  if (!ok) redirect(`${DADOS}?erro=geral`);
  redirect(`${DADOS}?email=enviado`);
}
