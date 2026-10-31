import Link from "next/link";

import { Aviso, campoTexto } from "@/components/marca/aviso";
import { BotaoSair } from "@/components/marca/botao-sair";
import { Cabecalho } from "@/components/marca/cabecalho";
import { Rodape } from "@/components/marca/rodape";
import { exigirCliente } from "@/lib/auth";
import { getFicha, getJanelaDeCancelamento, getMarcacoes } from "@/lib/conta";
import { type MarcacaoConta, podeCancelar, separar } from "@/lib/conta-regras";
import { diaPorExtenso, emLisboa, intervalo, precoEmEuros } from "@/lib/datas";
import { getDefinicoes } from "@/lib/dados";

import { cancelarDaConta, completarPerfil } from "./actions";

export const metadata = {
  title: "A minha conta | Catarina Neves Nails Studio",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  nome: "Escreva o seu nome.",
  tel: "Número inválido. Escreva os 9 números do telemóvel.",
  numero:
    "Não conseguimos associar este número à sua conta. Contacte o estúdio se precisar de ajuda.",
  limite: "Fez demasiados pedidos. Espere uns minutos e tente outra vez.",
  tarde: "Só é possível cancelar até 24 h antes. Contacte o estúdio.",
  geral: "Não foi possível concluir. Tente outra vez dentro de instantes.",
};

const um = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

function Linha({ m, cancelavel }: { m: MarcacaoConta; cancelavel: boolean }) {
  const { dia, hora } = emLisboa(m.inicio);
  const estado =
    m.estado === "cancelled"
      ? "Cancelada"
      : m.estado === "no_show"
        ? "Não compareceu"
        : null;
  return (
    <li className="tabular flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-display text-xl leading-6 font-semibold">
          {m.servico}
        </span>
        <span className="text-sm text-muted-foreground">
          {diaPorExtenso(dia)}, {intervalo(hora)}
        </span>
        <span className="text-sm text-muted-foreground">
          {precoEmEuros(m.precoCents)}
          {estado ? ` · ${estado}` : ""}
        </span>
      </div>
      {cancelavel ? (
        <form action={cancelarDaConta}>
          <input type="hidden" name="id" value={m.id} />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-danger underline-offset-4 hover:underline"
          >
            Cancelar
          </button>
        </form>
      ) : null}
    </li>
  );
}

export default async function Conta({ searchParams }: PageProps<"/conta">) {
  const u = await exigirCliente("/conta");
  const sp = await searchParams;
  const erro = ERROS[um(sp.erro) ?? ""];
  const ficha = await getFicha(u.id);

  if (!ficha) {
    return (
      <>
        <Cabecalho semEntrar />
        <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-5 pt-4 pb-10">
          <h1 className="font-display text-[32px] leading-9 font-semibold">
            Complete a sua conta
          </h1>
          {erro ? <Aviso>{erro}</Aviso> : null}
          <p className="text-base leading-6 text-muted-foreground">
            Sessão iniciada com {u.email}. Diga-nos o seu nome e telemóvel. Se
            já marcou connosco com este número, as suas marcações aparecem aqui.
          </p>
          <form action={completarPerfil} className="flex flex-col gap-[18px]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nome" className="text-sm font-semibold">
                Nome
              </label>
              <input
                id="nome"
                name="nome"
                autoComplete="name"
                required
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
                className={`${campoTexto} tabular`}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground hover:bg-primary-pressed"
            >
              Guardar
            </button>
          </form>
          <BotaoSair />
        </main>
        <Rodape />
      </>
    );
  }

  const [marcacoes, janela, def] = await Promise.all([
    getMarcacoes(),
    getJanelaDeCancelamento(),
    getDefinicoes(),
  ]);
  const agora = new Date();
  const { proximas, anteriores } = separar(marcacoes, agora);
  const ligadas = Number(um(sp.ligadas) ?? 0);

  return (
    <>
      <Cabecalho semEntrar />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-5 pt-4 pb-10">
        <h1 className="font-display text-[32px] leading-9 font-semibold">
          As minhas marcações
        </h1>
        <p className="text-sm text-muted-foreground">
          {ficha.nome} · {u.email}
        </p>
        {erro ? <Aviso>{erro}</Aviso> : null}
        {um(sp.cancelada) ? (
          <Aviso tipo="info">Marcação cancelada. A hora ficou livre.</Aviso>
        ) : null}
        {ligadas > 0 ? (
          <Aviso tipo="info">
            Encontrámos {ligadas}{" "}
            {ligadas === 1 ? "marcação antiga" : "marcações antigas"} com o seu
            telemóvel e juntámos à sua conta.
          </Aviso>
        ) : null}

        <section aria-labelledby="proximas" className="flex flex-col gap-3">
          <h2
            id="proximas"
            className="font-display text-2xl leading-7 font-semibold"
          >
            Próximas
          </h2>
          {proximas.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {proximas.map((m) => (
                <Linha
                  key={m.id}
                  m={m}
                  cancelavel={podeCancelar(m, agora, janela)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted-foreground">
              Não tem marcações futuras.
            </p>
          )}
          <p className="text-[13px] leading-[18px] text-muted-foreground">
            Pode cancelar até {janela} h antes.
            {def.contact_phone
              ? ` Depois disso, ligue para ${def.contact_phone}.`
              : " Depois disso, contacte o estúdio."}
          </p>
          <Link
            href="/marcar?modo=conta"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground no-underline hover:bg-primary-pressed"
          >
            Nova marcação
          </Link>
        </section>

        {anteriores.length ? (
          <section aria-labelledby="anteriores" className="flex flex-col gap-3">
            <h2
              id="anteriores"
              className="font-display text-2xl leading-7 font-semibold"
            >
              Anteriores
            </h2>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {anteriores.map((m) => (
                <Linha key={m.id} m={m} cancelavel={false} />
              ))}
            </ul>
          </section>
        ) : null}

        <nav className="flex flex-wrap gap-x-5">
          <Link
            href="/conta/dados"
            className="inline-flex min-h-11 items-center px-1 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
          >
            Os meus dados
          </Link>
          <BotaoSair />
        </nav>
      </main>
      <Rodape />
    </>
  );
}
