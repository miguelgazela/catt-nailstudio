import Link from "next/link";

import { Aviso, campoTexto } from "@/components/marca/aviso";
import { Cabecalho } from "@/components/marca/cabecalho";
import { Rodape } from "@/components/marca/rodape";
import { exigirCliente } from "@/lib/auth";
import { getFicha } from "@/lib/conta";

import { apagarConta, guardarDados } from "./actions";

export const metadata = {
  title: "Os meus dados | Catarina Neves Nails Studio",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  nome: "Escreva o seu nome.",
  tel: "Número inválido. Escreva os 9 números do telemóvel.",
  numero:
    "Não conseguimos usar este número. Contacte o estúdio se precisar de ajuda.",
  limite: "Fez demasiados pedidos. Espere uns minutos e tente outra vez.",
  geral: "Não foi possível concluir. Tente outra vez dentro de instantes.",
};

const um = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function Dados({
  searchParams,
}: PageProps<"/conta/dados">) {
  const u = await exigirCliente("/conta/dados");
  const sp = await searchParams;
  const ficha = await getFicha(u.id);
  const erro = ERROS[um(sp.erro) ?? ""];
  const aApagar = um(sp.apagar) === "1";

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-5 pt-4 pb-10">
        <div className="flex flex-col gap-1">
          <Link
            href="/conta"
            className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            ← As minhas marcações
          </Link>
          <h1 className="font-display text-[32px] leading-9 font-semibold">
            Os meus dados
          </h1>
        </div>
        {erro ? <Aviso>{erro}</Aviso> : null}
        {um(sp.guardado) ? <Aviso tipo="info">Dados guardados.</Aviso> : null}

        {ficha ? (
          <form action={guardarDados} className="flex flex-col gap-[18px]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nome" className="text-sm font-semibold">
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                autoComplete="name"
                required
                defaultValue={ficha.nome}
                className={campoTexto}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tel" className="text-sm font-semibold">
                Telemóvel
              </label>
              <input
                id="tel"
                name="tel"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                defaultValue={ficha.telefone ?? ""}
                className={`${campoTexto} tabular`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Email</span>
              <p className="min-h-12 rounded-md border border-border bg-secondary px-4 py-3 text-base">
                {u.email}
              </p>
              <p className="text-[13px] leading-[18px] text-muted-foreground">
                É o email com que entra. Para o mudar, contacte o estúdio.
              </p>
            </div>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground hover:bg-primary-pressed"
            >
              Guardar
            </button>
          </form>
        ) : (
          <Aviso tipo="info">
            Ainda não completou a conta.{" "}
            <Link href="/conta" className="font-semibold underline">
              Complete-a aqui
            </Link>
            .
          </Aviso>
        )}

        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="font-display text-2xl leading-7 font-semibold">
            Exportar os meus dados
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            Um ficheiro com o que guardamos sobre si: dados da conta e
            marcações.
          </p>
          <a
            href="/conta/dados/exportar"
            download
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-secondary text-base font-bold text-secondary-foreground no-underline hover:bg-accent"
          >
            Descarregar
          </a>
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-6">
          <h2 className="font-display text-2xl leading-7 font-semibold">
            Apagar a minha conta
          </h2>
          {aApagar ? (
            <>
              <Aviso>
                Vamos cancelar as suas marcações futuras e apagar o seu nome,
                telemóvel e email. Isto não se pode desfazer.
              </Aviso>
              <form action={apagarConta} className="flex flex-col gap-2">
                <button
                  type="submit"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-danger-surface text-base font-bold text-danger hover:bg-danger-surface/70"
                >
                  Sim, apagar a minha conta
                </button>
                <Link
                  href="/conta/dados"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full text-base font-bold text-primary no-underline hover:bg-accent"
                >
                  Manter a conta
                </Link>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm leading-5 text-muted-foreground">
                Cancela as marcações futuras e apaga os seus dados pessoais. O
                estúdio fica só com o registo das horas, sem o seu nome.
              </p>
              <Link
                href="/conta/dados?apagar=1"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-danger-surface text-base font-bold text-danger no-underline hover:bg-danger-surface/70"
              >
                Apagar a minha conta
              </Link>
            </>
          )}
        </section>
      </main>
      <Rodape />
    </>
  );
}
