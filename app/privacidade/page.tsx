import { Cabecalho } from "@/components/marca/cabecalho";
import { Rodape } from "@/components/marca/rodape";
import { LEGAL, aDefinir, legalCompleto } from "@/lib/legal";

export const metadata = { title: "Privacidade | Catarina Neves Nails Studio" };

export default function Privacidade() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-4 pb-10 text-base leading-6">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Como tratamos os seus dados
        </h1>
        {legalCompleto ? null : (
          <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            Texto provisório, em revisão antes do lançamento.
          </p>
        )}
        <h2 className="font-display text-[22px] font-semibold">
          Que dados pedimos
        </h2>
        <p>
          Nome e telemóvel para fazer e gerir a sua marcação. O email é
          opcional, serve para a confirmação, o lembrete e o link de
          cancelamento; se criar conta, é com ele que entra. Guardamos também o
          histórico das suas marcações. Não pedimos nem guardamos alergias ou
          outros dados de saúde.
        </p>
        <h2 className="font-display text-[22px] font-semibold">Para quê</h2>
        <p>
          Só para gerir a sua marcação e contactá-la se for preciso. Não
          enviamos publicidade.
        </p>
        <h2 className="font-display text-[22px] font-semibold">Quanto tempo</h2>
        <p>
          Se ficar 24 meses sem marcações, os seus dados pessoais são
          anonimizados automaticamente. Se apagar a conta ou pedir para apagar
          os dados, isso é feito logo; as cópias de segurança desaparecem quando
          rodam, ao fim de poucos dias.
        </p>
        <h2 className="font-display text-[22px] font-semibold">
          Os seus direitos
        </h2>
        <p>
          Pode ver, corrigir, exportar ou apagar os seus dados em &quot;Os meus
          dados&quot;, na sua conta, ou pedindo para {LEGAL.email ?? aDefinir}.
          Respondemos no prazo de um mês. Também pode apresentar queixa à{" "}
          <a
            href="https://www.cnpd.pt/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CNPD
          </a>
          .
        </p>
        <h2 className="font-display text-[22px] font-semibold">
          Quem trata os dados
        </h2>
        <p>
          O responsável é {LEGAL.responsavel ?? aDefinir},{" "}
          {LEGAL.morada ?? aDefinir}. Para isso usamos estes serviços, com
          contratos de proteção de dados: Supabase (base de dados e contas, na
          União Europeia), Vercel (alojamento do site), Resend (envio de emails,
          na União Europeia) e Cloudflare (teste anti-spam no formulário de
          marcação).
        </p>
        <h2 className="font-display text-[22px] font-semibold">Cookies</h2>
        <p>
          Só usamos cookies essenciais: o da sessão, para quem entra na conta, e
          os do teste anti-spam da Cloudflare. Não há cookies de publicidade nem
          de seguimento.
        </p>
        <h2 className="font-display text-[22px] font-semibold">
          Estatísticas de visitas
        </h2>
        <p>
          Contamos as visitas ao site com o Vercel Web Analytics, sem cookies e
          sem a identificar: vemos só que páginas são vistas, de onde vêm as
          visitas e o tipo de aparelho.
        </p>
        <p className="text-sm text-muted-foreground">
          Atualizado a {LEGAL.atualizado}.
        </p>
      </main>
      <Rodape />
    </>
  );
}
