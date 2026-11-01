import { Cabecalho } from "@/components/marca/cabecalho";
import { Rodape } from "@/components/marca/rodape";
import { LEGAL, aDefinir, legalCompleto } from "@/lib/legal";

export const metadata = { title: "Termos | Catarina Neves Nails Studio" };

const h2 = "font-display text-[22px] font-semibold";

export default function Termos() {
  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-4 pb-10 text-base leading-6">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          Termos de utilização
        </h1>
        {legalCompleto ? null : (
          <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            Texto provisório, em revisão antes do lançamento.
          </p>
        )}
        <h2 className={h2}>Quem presta o serviço</h2>
        <p>
          {LEGAL.responsavel ?? aDefinir}, NIF {LEGAL.nif ?? aDefinir}, com
          estúdio em {LEGAL.morada ?? aDefinir}. Contacto:{" "}
          {LEGAL.email ?? aDefinir}.
        </p>
        <h2 className={h2}>Marcações</h2>
        <p>
          Todas as marcações têm 1 hora e ficam confirmadas logo que as conclui.
          Se deixar o email, recebe a confirmação e um lembrete dois dias antes.
        </p>
        <h2 className={h2}>Cancelamento</h2>
        <p>
          Pode cancelar até 24 horas antes, pelo link do email ou na sua conta.
          Depois disso, contacte o estúdio.
        </p>
        <h2 className={h2}>Faltas</h2>
        <p>
          Se não puder vir, avise com antecedência para a hora ficar livre para
          outra cliente. {LEGAL.faltas ?? aDefinir}
        </p>
        <h2 className={h2}>Menores</h2>
        <p>
          {LEGAL.idadeMinima === null
            ? aDefinir
            : `Quem tem menos de ${LEGAL.idadeMinima} anos marca com a autorização de um adulto responsável.`}
        </p>
        <h2 className={h2}>Pagamento</h2>
        <p>
          O pagamento é feito no estúdio, ao preço indicado na marcação. Não
          cobramos nada online.
        </p>
        <h2 className={h2}>Conta</h2>
        <p>
          A conta é opcional. Entra com um link ou código enviado para o seu
          email, sem palavra-passe. Pode apagá-la a qualquer momento em &quot;Os
          meus dados&quot;.
        </p>
        <h2 className={h2}>Reclamações e litígios</h2>
        <p>
          Pode reclamar no{" "}
          <a
            href="https://www.livroreclamacoes.pt/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Livro de Reclamações Eletrónico
          </a>
          . Em caso de litígio, pode recorrer a{" "}
          {LEGAL.ral ? (
            <a href={LEGAL.ral.url} target="_blank" rel="noopener noreferrer">
              {LEGAL.ral.nome}
            </a>
          ) : (
            aDefinir
          )}
          , entidade de resolução alternativa de litígios de consumo. Mais
          informação no{" "}
          <a
            href="https://www.consumidor.gov.pt/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Portal do Consumidor
          </a>
          .
        </p>
        <p className="text-sm text-muted-foreground">
          Atualizado a {LEGAL.atualizado}.
        </p>
      </main>
      <Rodape />
    </>
  );
}
