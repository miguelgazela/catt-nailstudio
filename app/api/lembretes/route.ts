import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { carregarPorId, enviarLembrete } from "@/lib/email/marcacao";
import { elegiveisParaLembrete } from "@/lib/lembretes";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const HORA = 60 * 60 * 1000;

function autorizado(pedido: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  const recebido =
    pedido.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!segredo || recebido.length !== segredo.length) return false;
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(segredo));
}

// Chamada a cada 30 min pelo pg_cron do Supabase (job `send-reminders`).
export async function POST(pedido: Request) {
  if (!autorizado(pedido)) return new NextResponse(null, { status: 401 });

  const db = supabaseAdmin();
  const agora = new Date();
  const { data } = await db
    .from("appointments")
    .select("id, starts_at, created_at")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gt("starts_at", new Date(agora.getTime() + HORA).toISOString())
    .lte("starts_at", new Date(agora.getTime() + 24 * HORA).toISOString());

  let enviados = 0;
  let falhados = 0;
  for (const a of elegiveisParaLembrete(data ?? [], agora)) {
    // Reserva primeiro (duas chamadas seguidas nunca enviam o mesmo lembrete).
    const { data: reservada } = await db
      .from("appointments")
      .update({ reminder_sent_at: agora.toISOString() })
      .eq("id", a.id)
      .is("reminder_sent_at", null)
      .select("id");
    if (!reservada?.length) continue;

    const m = await carregarPorId(a.id);
    if (!m?.cliente.email) continue; // sem email: nada a enviar, fica registado
    if (await enviarLembrete(m)) {
      enviados++;
    } else {
      falhados++;
      await db
        .from("appointments")
        .update({ reminder_sent_at: null })
        .eq("id", a.id);
    }
  }
  return NextResponse.json({ enviados, falhados });
}
