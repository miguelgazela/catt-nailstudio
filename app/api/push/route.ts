import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { diaPorExtensoMinusculas, emLisboa } from "@/lib/datas";
import { notificarAdmins } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function autorizado(pedido: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  const recebido =
    pedido.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!segredo || recebido.length !== segredo.length) return false;
  return timingSafeEqual(Buffer.from(recebido), Buffer.from(segredo));
}

const corpo = z.object({
  id: z.string().uuid(),
  evento: z.enum(["nova", "cancelada"]),
});

// Chamada pela base de dados (trigger em `appointments` + pg_net) quando há uma marcação
// online nova ou cancelada pela cliente. Avisa os telemóveis da Catarina.
export async function POST(pedido: Request) {
  if (!autorizado(pedido)) return new NextResponse(null, { status: 401 });
  const p = corpo.safeParse(await pedido.json().catch(() => null));
  if (!p.success) return new NextResponse(null, { status: 400 });

  const { data: m } = await supabaseAdmin()
    .from("appointments")
    .select("id, starts_at, service:services(name)")
    .eq("id", p.data.id)
    .maybeSingle();
  if (!m) return new NextResponse(null, { status: 404 });

  const { dia, hora } = emLisboa(m.starts_at);
  const servico = (m.service as unknown as { name: string } | null)?.name ?? "";
  const quando = `${diaPorExtensoMinusculas(dia)}, ${hora}`;
  const enviados = await notificarAdmins({
    titulo: p.data.evento === "nova" ? "Nova marcação" : "Marcação cancelada",
    corpo: servico ? `${quando} · ${servico}` : quando,
    url: `/admin/marcacao/${m.id}`,
  });
  return NextResponse.json({ enviados });
}
