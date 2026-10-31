"use server";

import { redirect } from "next/navigation";

import { exigirUtilizador } from "@/lib/auth";
import { permitido } from "@/lib/seguranca";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizarTelemovel } from "@/lib/telemovel";

/** Primeira vez na conta: cria a ficha ou liga-a às marcações antigas com o mesmo telemóvel. */
export async function completarPerfil(formData: FormData) {
  const u = await exigirUtilizador("/conta");
  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = normalizarTelemovel(String(formData.get("tel") ?? ""));

  if (!nome || nome.length > 100) redirect("/conta?erro=nome");
  if (!telefone) redirect("/conta?erro=tel");
  if (!(await permitido(`perfil:${u.id}`, 10, 600)))
    redirect("/conta?erro=limite");

  const { data } = await supabaseAdmin().rpc("claim_client", {
    p_user_id: u.id,
    p_email: u.email ?? "",
    p_name: nome,
    p_phone: telefone,
  });
  const r = data as { ok?: boolean; error?: string; linked?: number } | null;
  if (r?.ok) redirect(`/conta?ligadas=${r.linked ?? 0}`);
  // Mesma resposta para "número de outra conta" e "ficha com outro email".
  if (r?.error === "phone_in_use") redirect("/conta?erro=numero");
  redirect("/conta?erro=geral");
}

export async function cancelarDaConta(formData: FormData) {
  const u = await exigirUtilizador("/conta");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) redirect("/conta");
  if (!(await permitido(`cancelar-conta:${u.id}`, 20, 600))) {
    redirect("/conta?erro=limite");
  }

  const { data } = await supabaseAdmin().rpc("cancel_appointment", {
    p_appointment: id,
    p_user_id: u.id,
  });
  const r = data as { ok?: boolean; error?: string } | null;
  if (r?.ok) redirect("/conta?cancelada=1");
  if (r?.error === "too_late") redirect("/conta?erro=tarde");
  redirect("/conta?erro=geral");
}
