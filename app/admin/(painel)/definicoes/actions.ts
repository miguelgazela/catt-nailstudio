"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirAdmin } from "@/lib/auth";
import { supabaseSessao } from "@/lib/supabase/sessao";
import { normalizarTelemovel } from "@/lib/telemovel";

export type EstadoDefinicoes = { erro?: string; ok?: boolean; campos?: Record<string, string> };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const int = (min: number, max: number, msg: string) =>
  z.coerce.number({ error: msg }).int(msg).min(min, msg).max(max, msg);

const esquema = z.object({
  aviso_horas: int(0, 168, "Escreva um número de horas entre 0 e 168."),
  max_dias: int(1, 365, "Escreva um número de dias entre 1 e 365."),
  cancelar_horas: int(0, 168, "Escreva um número de horas entre 0 e 168."),
  politica: z.string().max(3000, "O texto é demasiado longo."),
  morada: z.string().max(200, "A morada é demasiado longa."),
  instagram: z.string().max(100, "O nome é demasiado longo."),
});

export async function guardarDefinicoes(
  _a: EstadoDefinicoes,
  dados: FormData,
): Promise<EstadoDefinicoes> {
  await exigirAdmin("/admin/definicoes");
  const t = (k: string) => String(dados.get(k) ?? "").trim();
  const p = esquema.safeParse({
    aviso_horas: t("aviso_horas"),
    max_dias: t("max_dias"),
    cancelar_horas: t("cancelar_horas"),
    politica: t("politica"),
    morada: t("morada"),
    instagram: t("instagram").replace(/^@/, ""),
  });
  const campos: Record<string, string> = {};
  if (!p.success) {
    for (const i of p.error.issues) campos[String(i.path[0])] ??= i.message;
  }
  const telBruto = t("telefone");
  const tel = telBruto ? normalizarTelemovel(telBruto) : null;
  if (telBruto && !tel) campos.telefone = "Número inválido. Escreva os 9 números.";
  const email = t("email");
  if (email && (!EMAIL.test(email) || email.length > 254)) campos.email = "Email inválido.";
  if (Object.keys(campos).length || !p.success) {
    return { erro: "Veja os campos assinalados.", campos };
  }
  const d = p.data;

  const sb = await supabaseSessao();
  const { error } = await sb
    .from("settings")
    .update({
      min_notice_minutes: d.aviso_horas * 60,
      max_advance_days: d.max_dias,
      cancel_window_hours: d.cancelar_horas,
      contact_phone: tel,
      contact_email: email || null,
      address: d.morada || null,
      instagram: d.instagram || null,
      policy_text: d.politica,
      notify_on_booking: dados.get("avisos") === "on",
    })
    .eq("id", true);
  if (error) return { erro: "Não foi possível guardar." };
  revalidatePath("/", "layout");
  return { ok: true };
}
