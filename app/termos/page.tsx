import { Cabecalho } from "@/components/marca/cabecalho";
import { Rodape } from "@/components/marca/rodape";

export const metadata = { title: "Termos | Catarina Neves Nails Studio" };

export default function Termos() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-4 pb-10 text-base leading-6">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Termos de utilização
        </h1>
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          Texto provisório, em revisão antes do lançamento.
        </p>
        <h2 className="font-display text-[22px] font-semibold">Marcações</h2>
        <p>
          Todas as marcações têm 1 hora e ficam confirmadas logo que as conclui.
        </p>
        <h2 className="font-display text-[22px] font-semibold">Cancelamento</h2>
        <p>
          Pode cancelar até 24 horas antes. Depois disso, contacte o estúdio.
        </p>
        <h2 className="font-display text-[22px] font-semibold">Pagamento</h2>
        <p>O pagamento é feito no estúdio. Não cobramos nada online.</p>
      </main>
      <Rodape />
    </>
  );
}
