"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { COOKIE_PAINEL } from "@/lib/sessao-painel";

import { supabaseSessao } from "@/lib/supabase/sessao";

export async function sair() {
  const sb = await supabaseSessao();
  await sb.auth.signOut();
  (await cookies()).delete(COOKIE_PAINEL);
  redirect("/");
}
