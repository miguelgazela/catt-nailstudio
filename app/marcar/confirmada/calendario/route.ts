import { gerarIcs } from "@/lib/calendario";
import { carregarPorId } from "@/lib/email/marcacao";

export const dynamic = "force-dynamic";

// O id (uuid aleatório) vem do ecrã de confirmação, como na página.
export async function GET(pedido: Request) {
  const id = new URL(pedido.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const m = await carregarPorId(id);
  if (!m || m.estado !== "confirmed")
    return new Response(null, { status: 404 });

  const ics = gerarIcs({
    id: m.marcacao.id,
    inicio: m.marcacao.inicio,
    titulo: `${m.marcacao.servico}, Catarina Neves Nails Studio`,
    descricao: "Pagamento no estúdio. Podes cancelar até 24 h antes.",
    local: m.marcacao.morada,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="marcacao.ics"',
      "Cache-Control": "no-store",
    },
  });
}
