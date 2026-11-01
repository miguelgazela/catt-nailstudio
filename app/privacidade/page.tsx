import { Cabecalho } from "@/components/marca/cabecalho";
import { Rodape } from "@/components/marca/rodape";

export const metadata = { title: "Privacidade | Catarina Neves Nails Studio" };

export default function Privacidade() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-4 pb-10 text-base leading-6">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Como tratamos os seus dados
        </h1>
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          Texto provisório, em revisão antes do lançamento.
        </p>
        <h2 className="font-display text-[22px] font-semibold">
          Que dados pedimos
        </h2>
        <p>
          Nome e telemóvel para fazer e gerir a sua marcação. O email é
          opcional, serve para a confirmação e para o link de cancelamento.
          Guardamos também o histórico das suas marcações. Não pedimos nem
          guardamos alergias ou outros dados de saúde.
        </p>
        <h2 className="font-display text-[22px] font-semibold">Para quê</h2>
        <p>
          Só para gerir a sua marcação e contactá-la se for preciso. Não
          enviamos publicidade.
        </p>
        <h2 className="font-display text-[22px] font-semibold">Quanto tempo</h2>
        <p>
          Se ficar 24 meses sem marcações, os seus dados pessoais são
          anonimizados automaticamente.
        </p>
        <h2 className="font-display text-[22px] font-semibold">
          Os seus direitos
        </h2>
        <p>
          Pode pedir para ver, corrigir ou apagar os seus dados, contactando o
          estúdio. Respondemos no prazo de um mês.
        </p>
        <h2 className="font-display text-[22px] font-semibold">
          Quem trata os dados
        </h2>
        <p>
          O estúdio da Catarina Neves é o responsável. Usamos serviços de
          alojamento e base de dados na União Europeia, e um teste anti-spam da
          Cloudflare no formulário. Só usamos cookies essenciais.
        </p>
        <h2 className="font-display text-[22px] font-semibold">
          Estatísticas de visitas
        </h2>
        <p>
          Contamos as visitas ao site com o Vercel Web Analytics, sem cookies e
          sem a identificar: vemos só que páginas são vistas, de onde vêm as
          visitas e o tipo de aparelho.
        </p>
      </main>
      <Rodape />
    </>
  );
}
