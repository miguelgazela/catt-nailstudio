import { Cabecalho } from "@/components/marca/cabecalho";
import { BotaoSair } from "@/components/marca/botao-sair";
import { exigirAdminSemMfa } from "@/lib/auth";
import { caminhoSeguro } from "@/lib/caminho";
import { supabaseSessao } from "@/lib/supabase/sessao";

import { FormMfa } from "./form-mfa";

export const metadata = {
  title: "Código de segurança | Catarina Neves Nails Studio",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function Mfa({ searchParams }: PageProps<"/admin/mfa">) {
  const { next } = await searchParams;
  const destino = caminhoSeguro(
    typeof next === "string" ? next : null,
    "/admin",
  );
  await exigirAdminSemMfa(`/admin/mfa?next=${encodeURIComponent(destino)}`);
  const sb = await supabaseSessao();
  const { data } = await sb.auth.mfa.listFactors();
  const factorId = data?.totp[0]?.id ?? null;

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-5 pt-4 pb-10">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          {factorId ? "Código de segurança" : "Proteger o painel"}
        </h1>
        <FormMfa factorId={factorId} destino={destino} />
        <BotaoSair />
      </main>
    </>
  );
}
