"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { caminhoSeguro } from "@/lib/caminho";
import { chaveEmail, enviarCodigoDeEntrada } from "@/lib/email/entrada";
import { permitido, verificarTurnstile } from "@/lib/seguranca";
import { supabaseSessao } from "@/lib/supabase/sessao";

export type EstadoEntrar = {
  erro?: string;
  campoEmail?: string;
  enviado?: boolean;
  email?: string;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function pedirCodigo(
  _anterior: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const destino = caminhoSeguro(String(formData.get("next") ?? ""));
  const token = String(formData.get("cf-turnstile-response") ?? "");

  if (!email) return { campoEmail: "Escreve o teu email.", email };
  if (email.length > 254 || !EMAIL.test(email)) {
    return {
      campoEmail: "Email inválido. Confirma se tens o @ e o domínio.",
      email,
    };
  }

  const h = await headers();
  const ip =
    h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verificarTurnstile(token, ip))) {
    return {
      erro: "Não conseguimos confirmar que és uma pessoa. Tenta outra vez.",
      email,
    };
  }
  const ok =
    (await permitido(`entrar-ip:${ip ?? "?"}`, 10, 600)) &&
    (await permitido(`entrar-email:${chaveEmail(email)}`, 3, 600));
  if (!ok) {
    return {
      erro: "Fizeste demasiados pedidos. Espera uns minutos e tenta outra vez.",
      email,
    };
  }

  await enviarCodigoDeEntrada(email, destino);
  // Mesma resposta haja ou não conta: não revelamos quem tem conta.
  return { enviado: true, email };
}

export type EstadoCodigo = { erro?: string };

const CODIGO = /^\d{6,10}$/;

/** Entrar com o código do email. */
export async function entrarComCodigo(
  _anterior: EstadoCodigo,
  formData: FormData,
): Promise<EstadoCodigo> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const codigo = String(formData.get("codigo") ?? "").replace(/\s/g, "");
  const destino = caminhoSeguro(String(formData.get("next") ?? ""));
  if (!EMAIL.test(email) || !CODIGO.test(codigo)) {
    return { erro: "Escreve o código que recebeste no email." };
  }
  const h = await headers();
  const ip =
    h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ok =
    (await permitido(`codigo-ip:${ip ?? "?"}`, 20, 600, true)) &&
    (await permitido(`codigo-email:${chaveEmail(email)}`, 5, 600, true));
  if (!ok) {
    return { erro: "Demasiadas tentativas. Espera uns minutos e pede outro." };
  }
  const sb = await supabaseSessao();
  const { error } = await sb.auth.verifyOtp({
    email,
    token: codigo,
    type: "email",
  });
  if (error) return { erro: "Código errado ou expirado. Confirma no email." };
  redirect(destino);
}
