import { getUtilizador } from "@/lib/auth";
import { supabaseSessao } from "@/lib/supabase/sessao";

export const dynamic = "force-dynamic";

// Direito de acesso e portabilidade (RGPD): tudo o que guardamos sobre a pessoa, em JSON.
// Lê com a sessão da pessoa, por isso o RLS garante que só vê o que é seu.
export async function GET() {
  const u = await getUtilizador();
  if (!u) return new Response("Não autenticado", { status: 401 });

  const sb = await supabaseSessao();
  const [{ data: ficha }, { data: marcacoes }] = await Promise.all([
    sb
      .from("clients")
      .select("name, phone, email, notes, no_show_count, created_at")
      .eq("user_id", u.id)
      .maybeSingle(),
    sb
      .from("appointments")
      .select(
        "starts_at, ends_at, status, price_cents, origin, created_at, cancelled_at, cancelled_by, services(name)",
      )
      .order("starts_at"),
  ]);

  const corpo = {
    exportadoEm: new Date().toISOString(),
    conta: { email: u.email },
    ficha,
    marcacoes: (marcacoes ?? []).map(({ services, ...resto }) => ({
      ...resto,
      servico: services?.name ?? null,
    })),
  };
  return new Response(JSON.stringify(corpo, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="os-meus-dados.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
