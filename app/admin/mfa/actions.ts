"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { exigirAdminSemMfa } from "@/lib/auth";
import { caminhoSeguro } from "@/lib/caminho";
import { permitido } from "@/lib/seguranca";
import {
  COOKIE_PAINEL,
  criarCookiePainel,
  opcoesCookiePainel,
} from "@/lib/sessao-painel";
import { supabaseSessao } from "@/lib/supabase/sessao";

export type Inscricao = {
  erro?: string;
  factorId?: string;
  qr?: string;
  segredo?: string;
};
export type EstadoCodigo = { erro?: string };

const CODIGO = /^\d{6}$/;

/** Cria o fator TOTP (ainda por confirmar). Apaga tentativas anteriores por confirmar. */
export async function comecarInscricao(): Promise<Inscricao> {
  await exigirAdminSemMfa("/admin/mfa");
  const sb = await supabaseSessao();
  const { data: lista } = await sb.auth.mfa.listFactors();
  for (const f of lista?.all ?? []) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await sb.auth.mfa.unenroll({ factorId: f.id });
    }
  }
  if (lista?.totp.length) return { erro: "O MFA já está configurado." };
  const { data, error } = await sb.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "App autenticadora",
  });
  if (error || !data)
    return { erro: "Não foi possível começar. Tente outra vez." };
  return {
    factorId: data.id,
    qr: data.totp.qr_code,
    segredo: data.totp.secret,
  };
}

async function verificar(
  factorId: string,
  codigo: string,
  destino: string,
): Promise<EstadoCodigo> {
  const u = await exigirAdminSemMfa("/admin/mfa");
  if (!CODIGO.test(codigo)) return { erro: "O código tem 6 números." };
  if (!(await permitido(`mfa:${u.id}`, 8, 600, true))) {
    return { erro: "Demasiadas tentativas. Espere uns minutos." };
  }
  const sb = await supabaseSessao();
  const { error } = await sb.auth.mfa.challengeAndVerify({
    factorId,
    code: codigo,
  });
  if (error)
    return {
      erro: "Código errado ou expirado. Veja o que a app mostra agora.",
    };
  (await cookies()).set(
    COOKIE_PAINEL,
    criarCookiePainel(u.id),
    opcoesCookiePainel,
  );
  redirect(caminhoSeguro(destino, "/admin"));
}

export async function confirmarCodigo(
  _anterior: EstadoCodigo,
  dados: FormData,
): Promise<EstadoCodigo> {
  return verificar(
    String(dados.get("factorId") ?? ""),
    String(dados.get("codigo") ?? "").replace(/\s/g, ""),
    String(dados.get("next") ?? ""),
  );
}
