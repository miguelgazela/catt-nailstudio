"use server";

import { redirect } from "next/navigation";

import { supabaseSessao } from "@/lib/supabase/sessao";

export async function sair() {
  const sb = await supabaseSessao();
  await sb.auth.signOut();
  redirect("/");
}
