import { NextResponse } from "next/server";

import { exigirAdmin } from "@/lib/auth";
import { supabaseSessao } from "@/lib/supabase/sessao";

export const dynamic = "force-dynamic";

// Direito de acesso: tudo o que guardamos sobre a cliente, num ficheiro JSON.
export async function GET(
  _pedido: Request,
  { params }: RouteContext<"/admin/clientes/[id]/exportar">,
) {
  const { id } = await params;
  await exigirAdmin(`/admin/clientes/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id))
    return new NextResponse("Não encontrada", { status: 404 });
  const sb = await supabaseSessao();
  const { data: cliente } = await sb
    .from("clients")
    .select(
      "id, name, phone, email, notes, blocked, no_show_count, created_at, anonymized_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!cliente) return new NextResponse("Não encontrada", { status: 404 });
  const { data: marcacoes } = await sb
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, origin, price_cents, note, cancelled_by, cancelled_at, created_at, service:services(name)",
    )
    .eq("client_id", id)
    .order("starts_at");
  const corpo = JSON.stringify(
    {
      exportado_em: new Date().toISOString(),
      cliente,
      marcacoes: marcacoes ?? [],
    },
    null,
    2,
  );
  return new NextResponse(corpo, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="cliente-${id.slice(0, 8)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
