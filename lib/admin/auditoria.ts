// Texto do registo de alterações. A BD guarda quem, o quê e que colunas mudaram, nunca valores.
const COLUNAS: Record<string, string> = {
  status: "estado",
  starts_at: "hora",
  ends_at: "hora",
  note: "nota",
  service_id: "serviço",
  price_cents: "preço",
  client_id: "cliente",
  cancelled_by: "quem cancelou",
  cancelled_at: "cancelamento",
  cancel_token_hash: "link de cancelamento",
  reminder_sent_at: "lembrete",
};

export type EntradaAuditoria = {
  at: string;
  actor: string | null;
  action: string;
  details: unknown;
};

export function descreverAuditoria(e: EntradaAuditoria): string {
  const quem = e.actor ? "no painel" : "online ou automático";
  if (e.action === "insert") return `Marcação criada (${quem})`;
  if (e.action === "delete") return `Marcação apagada (${quem})`;
  if (e.action === "update") {
    const cols = (e.details as { columns?: string[] } | null)?.columns ?? [];
    const nomes = [...new Set(cols.map((c) => COLUNAS[c] ?? c))];
    return `Alterado: ${nomes.join(", ") || "dados"} (${quem})`;
  }
  return `${e.action} (${quem})`;
}
