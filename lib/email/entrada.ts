import "server-only";

import { createHash } from "node:crypto";

import { enviarEmail } from "./enviar";
import { emailEntrada } from "./modelos";
import { urlDoSite } from "./marcacao";
import { supabaseAdmin } from "../supabase/admin";

/**
 * Gera o link de entrada (válido 1 hora, uso único) e envia-o pelo Resend.
 * Devolve sempre sem erro, quer o email exista quer não: quem pede nunca descobre se há conta.
 */
export async function enviarLinkDeEntrada(
  email: string,
  destino: string,
): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const token = data?.properties?.hashed_token;
    if (error || !token) {
      console.error("Não foi possível gerar o link de entrada");
      return;
    }
    const link = `${urlDoSite()}/auth/confirmar?token_hash=${encodeURIComponent(token)}&type=magiclink&next=${encodeURIComponent(destino)}`;
    const e = emailEntrada({ link, siteUrl: urlDoSite() });
    await enviarEmail({ para: email, ...e });
  } catch {
    console.error("Falha ao enviar o link de entrada");
  }
}

/** Hash curto só para limitar pedidos por email sem guardar o email. */
export const chaveEmail = (email: string) =>
  createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 32);
