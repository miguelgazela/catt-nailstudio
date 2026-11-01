import "server-only";

type Email = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  anexos?: { nome: string; conteudo: string; tipo: string }[];
};

const DE =
  process.env.EMAIL_FROM ??
  "Catarina Neves Nails Studio <onboarding@resend.dev>";

/** Devolve true se o Resend aceitou o email. Sem chave configurada, não envia (desenvolvimento e testes). */
export async function enviarEmail(e: Email): Promise<boolean> {
  // Testes automáticos: finge que enviou, sem rede.
  if (process.env.EMAIL_DRY_RUN === "1") return true;
  const chave = process.env.RESEND_API_KEY;
  if (!chave) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: DE,
        to: [e.para],
        // Respostas das clientes vão para a Catarina, não para o endereço de envio.
        ...(process.env.EMAIL_REPLY_TO
          ? { reply_to: process.env.EMAIL_REPLY_TO }
          : {}),
        subject: e.assunto,
        html: e.html,
        text: e.texto,
        attachments: e.anexos?.map((a) => ({
          filename: a.nome,
          content: Buffer.from(a.conteudo, "utf8").toString("base64"),
          content_type: a.tipo,
        })),
      }),
    });
    if (!r.ok) {
      // Nunca registar o corpo (tem email da cliente); só o estado.
      console.error(`Resend recusou o email (${r.status})`);
    }
    return r.ok;
  } catch {
    console.error("Falha de rede ao enviar email");
    return false;
  }
}
