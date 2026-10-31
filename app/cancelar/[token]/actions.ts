"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { permitido } from "@/lib/seguranca";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function cancelarMarcacao(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) redirect("/");

  const h = await headers();
  const ip =
    h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await permitido(`cancelar:${ip ?? "?"}`, 20, 600))) {
    redirect(`/cancelar/${token}`);
  }

  const { data } = await supabaseAdmin().rpc("cancel_appointment", {
    p_token: token,
  });
  const r = data as { ok?: boolean; error?: string } | null;

  if (r?.ok) redirect("/cancelar/ok");
  if (r?.error === "too_late") redirect(`/cancelar/${token}?erro=tarde`);
  redirect(`/cancelar/${token}`);
}
