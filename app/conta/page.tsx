import { Cabecalho } from "@/components/marca/cabecalho";
import { BotaoSair } from "@/components/marca/botao-sair";
import { Rodape } from "@/components/marca/rodape";
import { exigirUtilizador } from "@/lib/auth";

export const metadata = {
  title: "A minha conta | Catarina Neves Nails Studio",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

// Esqueleto do M3: aqui vão as marcações, os dados e o apagar conta.
export default async function Conta() {
  const u = await exigirUtilizador("/conta");
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-4 pb-10">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          As minhas marcações
        </h1>
        <p className="text-base text-muted-foreground">
          Sessão iniciada com {u.email}.
        </p>
        <BotaoSair />
      </main>
      <Rodape />
    </>
  );
}
