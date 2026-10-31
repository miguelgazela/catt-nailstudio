"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { exigirAdmin } from "@/lib/auth";
import { supabaseSessao } from "@/lib/supabase/sessao";
import { normalizarTelemovel } from "@/lib/telemovel";

export type EstadoCliente = { erro?: string; ok?: boolean; campos?: Record<string, string> };

const UUID = z.string().uuid();
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function guardarCliente(_a: EstadoCliente, dados: FormData): Promise<EstadoCliente> {
  await exigirAdmin("/admin/clientes");
  const id = UUID.safeParse(dados.get("id"));
  if (!id.success) return { erro: "Cliente inválida." };
  const nome = String(dados.get("nome") ?? "").trim();
  const telBruto = String(dados.get("tel") ?? "").trim();
  const email = String(dados.get("email") ?? "").trim();
  const notas = String(dados.get("notas") ?? "").trim();
  const campos: Record<string, string> = {};
  if (!nome) campos.nome = "Escreva o nome.";
  else if (nome.length > 100) campos.nome = "O nome é demasiado longo.";
  const tel = telBruto ? normalizarTelemovel(telBruto) : null;
  if (telBruto && !tel) campos.tel = "Número inválido. Escreva os 9 números do telemóvel.";
  if (email && (!EMAIL.test(email) || email.length > 254)) campos.email = "Email inválido.";
  if (notas.length > 1000) campos.notas = "As notas são demasiado longas (máximo 1000 letras).";
  if (Object.keys(campos).length) return { erro: "Veja os campos assinalados.", campos };

  const sb = await supabaseSessao();
  const { data, error } = await sb
    .from("clients")
    .update({ name: nome, phone: tel, email: email || null, notes: notas || null })
    .eq("id", id.data)
    .is("anonymized_at", null)
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") return { erro: "Já existe outra cliente com este número.", campos: { tel: "Número já usado." } };
  if (error || !data) return { erro: "Não foi possível guardar." };
  revalidatePath("/admin/clientes", "layout");
  return { ok: true };
}

export async function mudarBloqueio(dados: FormData) {
  await exigirAdmin("/admin/clientes");
  const id = UUID.safeParse(dados.get("id"));
  if (!id.success) redirect("/admin/clientes");
  const bloquear = dados.get("bloquear") === "1";
  const sb = await supabaseSessao();
  await sb.from("clients").update({ blocked: bloquear }).eq("id", id.data).is("anonymized_at", null);
  revalidatePath("/admin/clientes", "layout");
  redirect(`/admin/clientes/${id.data}?feito=${bloquear ? "bloqueada" : "desbloqueada"}`);
}

export async function apagarCliente(dados: FormData) {
  await exigirAdmin("/admin/clientes");
  const id = UUID.safeParse(dados.get("id"));
  if (!id.success) redirect("/admin/clientes");
  const sb = await supabaseSessao();
  const { error } = await sb.rpc("anonymize_client", { p_client: id.data });
  if (error) redirect(`/admin/clientes/${id.data}?erro=apagar`);
  revalidatePath("/admin", "layout");
  redirect("/admin/clientes?feito=apagada");
}
