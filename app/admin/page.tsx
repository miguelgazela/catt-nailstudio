import { BotaoSair } from "@/components/marca/botao-sair";
import { exigirAdmin } from "@/lib/auth";

export const metadata = {
  title: "Painel | Catarina Neves Nails Studio",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

// Esqueleto do M4: aqui vai a agenda.
export default async function Painel() {
  const u = await exigirAdmin("/admin");
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-8 pb-10">
      <h1 className="font-display text-[32px] leading-9 font-semibold">
        Painel
      </h1>
      <p className="text-base text-muted-foreground">
        Sessão de administradora: {u.email}.
      </p>
      <BotaoSair />
    </main>
  );
}
