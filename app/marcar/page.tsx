import Link from "next/link";

import { DiaHora } from "@/components/marca/dia-hora";
import { FormDados } from "@/components/marca/form-dados";
import { Passo } from "@/components/marca/passo";
import { Rodape } from "@/components/marca/rodape";
import { ServiceCard } from "@/components/marca/service-card";
import {
  diaPorExtenso,
  hojeEmLisboa,
  intervalo,
  precoEmEuros,
  somarDias,
} from "@/lib/datas";
import {
  getDefinicoes,
  getServico,
  getServicos,
  getVagasDaJanela,
} from "@/lib/dados";

export const metadata = { title: "Marcar | Catarina Neves Nails Studio" };
export const dynamic = "force-dynamic";

const um = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function Marcar({ searchParams }: PageProps<"/marcar">) {
  const sp = await searchParams;
  const servicoId = um(sp.servico);
  const dia = um(sp.dia);
  const hora = um(sp.hora);
  const ocupada = um(sp.erro) === "ocupada";

  const servico = servicoId ? await getServico(servicoId) : null;

  // Passo 1: serviço
  if (!servico) {
    const [servicos, def] = await Promise.all([getServicos(), getDefinicoes()]);
    return (
      <>
        <Passo n={1} voltar="/" />
        <main className="mx-auto flex w-full max-w-xl flex-col gap-3 px-5 pt-6 pb-10">
          <h1 className="font-display text-[32px] leading-9 font-semibold">
            Escolha o serviço
          </h1>
          <p className="mb-2 text-[15px] text-muted-foreground">
            Todas as marcações têm 1 hora.
          </p>
          {servicos.length ? (
            servicos.map((s) => (
              <ServiceCard
                key={s.id}
                id={s.id}
                nome={s.name}
                descricao={s.description}
                precoCents={s.price_cents}
              />
            ))
          ) : (
            <p className="text-base text-muted-foreground">
              Ainda não há serviços disponíveis para marcar online.
              {def.contact_phone ? ` Ligue para ${def.contact_phone}.` : ""}
            </p>
          )}
        </main>
        <Rodape />
      </>
    );
  }

  const def = await getDefinicoes();
  const vagas = await getVagasDaJanela(def.max_advance_days);
  const hoje = hojeEmLisboa();

  // Passo 3: dados (só se a hora escolhida ainda estiver livre)
  const horaValida =
    dia && hora && vagas.some((v) => v.dia === dia && v.hora === hora);
  if (dia && hora && horaValida) {
    return (
      <>
        <Passo n={3} voltar={`/marcar?servico=${servico.id}&dia=${dia}`} />
        <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-5 pt-4 pb-10">
          <h1 className="font-display text-[32px] leading-9 font-semibold">
            Os seus dados
          </h1>
          <div className="tabular flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="font-display text-xl leading-6 font-semibold">
                {servico.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {diaPorExtenso(dia)}, {intervalo(hora)}
              </span>
              <span className="text-sm text-muted-foreground">
                {precoEmEuros(servico.price_cents)}, paga no estúdio
              </span>
            </div>
            <Link
              href={`/marcar?servico=${servico.id}&dia=${dia}`}
              className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              Alterar
            </Link>
          </div>
          <FormDados
            servicoId={servico.id}
            dia={dia}
            hora={hora}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
          />
        </main>
        <Rodape />
      </>
    );
  }

  // Passo 2: dia e hora
  if (!vagas.length) {
    return (
      <>
        <Passo n={2} voltar="/marcar" />
        <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-5 pt-6 pb-10">
          <h1 className="font-display text-[32px] leading-9 font-semibold">
            Sem vagas por agora
          </h1>
          <p className="text-base leading-6 text-muted-foreground">
            Não há horas livres nas próximas{" "}
            {Math.round(def.max_advance_days / 7)} semanas.
            {def.contact_phone ? (
              <>
                {" "}
                Ligue para{" "}
                <span className="tabular font-semibold text-foreground">
                  {def.contact_phone}
                </span>{" "}
                para combinar uma hora.
              </>
            ) : (
              " Volte a tentar daqui a uns dias."
            )}
          </p>
        </main>
        <Rodape />
      </>
    );
  }

  return (
    <>
      <Passo n={2} voltar="/marcar" />
      <DiaHora
        servicoId={servico.id}
        servicoNome={servico.name}
        vagas={vagas}
        hoje={hoje}
        ultimoDia={somarDias(hoje, def.max_advance_days)}
        diaInicial={dia}
        ocupada={ocupada || Boolean(dia && hora && !horaValida)}
      />
    </>
  );
}
