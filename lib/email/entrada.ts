import "server-only";

import { createHash } from "node:crypto";

import { enviarEmail } from "./enviar";
import { emailEntrada } from "./modelos";
import { urlDoSite } from "./marcacao";
import { supabaseAdmin } from "../supabase/admin";

/**
 * Gera o código de entrada (válido 1 hora, uso único) e envia-o pelo Resend.
 * Só código, sem link: os scanners de email (Gmail, Outlook) e o browser dentro da app de
 * email abriam o link antes da pessoa e gastavam o token (o código ia junto), e o login
 * ficava no browser errado.
 * Devolve sempre sem erro, quer o email exista quer não: quem pede nunca descobre se há conta.
 * Para o painel (/admin) só envia a admins: os outros não recebem nada nem ficam com conta criada.
 */
export async function enviarCodigoDeEntrada(
  email: string,
  destino: string,
): Promise<void> {
  try {
    if (/^\/admin(\/|\?|$)/.test(destino)) {
      const { data: admin, error } = await supabaseAdmin().rpc(
        "is_admin_email",
        { p_email: email },
      );
      if (error || !admin) return;
    }
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const codigo = data?.properties?.email_otp;
    if (error || !codigo) {
      console.error("Não foi possível gerar o código de entrada");
      return;
    }
    const e = emailEntrada({ codigo, siteUrl: urlDoSite() });
    await enviarEmail({ para: email, ...e });
  } catch {
    console.error("Falha ao enviar o código de entrada");
  }
}

/** Hash curto só para limitar pedidos por email sem guardar o email. */
export const chaveEmail = (email: string) =>
  createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 32);
