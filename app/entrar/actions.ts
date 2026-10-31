"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { caminhoSeguro } from "@/lib/caminho";
import { chaveEmail, enviarLinkDeEntrada } from "@/lib/email/entrada";
import { permitido, verificarTurnstile } from "@/lib/seguranca";
import { supabaseSessao } from "@/lib/supabase/sessao";

export type EstadoEntrar = {
  erro?: string;
  campoEmail?: string;
  enviado?: boolean;
  email?: string;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function pedirLink(
  _anterior: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const destino = caminhoSeguro(String(formData.get("next") ?? ""));
  const token = String(formData.get("cf-turnstile-response") ?? "");

  if (!email) return { campoEmail: "Escreva o seu email.", email };
  if (email.length > 254 || !EMAIL.test(email)) {
    return {
      campoEmail: "Email inválido. Confirme se tem o @ e o domínio.",
      email,
    };
  }

  const h = await headers();
  const ip =
    h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verificarTurnstile(token, ip))) {
    return {
      erro: "Não conseguimos confirmar que é uma pessoa. Tente outra vez.",
      email,
    };
  }
  const ok =
    (await permitido(`entrar-ip:${ip ?? "?"}`, 10, 600)) &&
    (await permitido(`entrar-email:${chaveEmail(email)}`, 3, 600));
  if (!ok) {
    return {
      erro: "Fez demasiados pedidos. Espere uns minutos e tente outra vez.",
      email,
    };
  }

  await enviarLinkDeEntrada(email, destino);
  // Mesma resposta haja ou não conta: não revelamos quem tem conta.
  return { enviado: true, email };
}

export type EstadoCodigo = { erro?: string };

const CODIGO = /^\d{6,10}$/;

/** Entrar com o código do email (para a app instalada, onde o link abre noutro browser). */
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
    return { erro: "Escreva o código que recebeu no email." };
  }
  const h = await headers();
  const ip =
    h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ok =
    (await permitido(`codigo-ip:${ip ?? "?"}`, 20, 600)) &&
    (await permitido(`codigo-email:${chaveEmail(email)}`, 5, 600));
  if (!ok) {
    return { erro: "Demasiadas tentativas. Espere uns minutos e peça outro." };
  }
  const sb = await supabaseSessao();
  const { error } = await sb.auth.verifyOtp({
    email,
    token: codigo,
    type: "email",
  });
  if (error) return { erro: "Código errado ou expirado. Confirme no email." };
  redirect(destino);
}
