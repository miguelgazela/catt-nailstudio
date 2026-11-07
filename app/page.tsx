import { AtSign, Clock, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { Cabecalho } from "@/components/marca/cabecalho";
import { MiniMapa } from "@/components/marca/mini-mapa";
import { Rodape } from "@/components/marca/rodape";
import { ServiceCard } from "@/components/marca/service-card";
import { Splash } from "@/components/marca/splash";
import { diaPorExtensoMinusculas, hojeEmLisboa, somarDias } from "@/lib/datas";
import {
  getDefinicoes,
  getHorario,
  getServicos,
  getVagasDaJanela,
} from "@/lib/dados";

export const dynamic = "force-dynamic";

const botao =
  "inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-primary-foreground no-underline transition-colors hover:bg-primary-pressed";

function Linha({
  icone,
  children,
}: {
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-3.5 last:border-b-0">
      <span className="mt-0.5 text-primary [&_svg]:size-5">{icone}</span>
      <div className="text-base leading-6">{children}</div>
    </div>
  );
}

export default async function Home() {
  const [servicos, def, horario] = await Promise.all([
    getServicos(),
    getDefinicoes(),
    getHorario(),
  ]);
  const vagas = await getVagasDaJanela(def.max_advance_days);
  const proxima = vagas[0];
  const amanha = somarDias(hojeEmLisboa(), 1);
  const textoProxima = proxima
    ? `${proxima.dia === hojeEmLisboa() ? "hoje" : proxima.dia === amanha ? "amanhã" : diaPorExtensoMinusculas(proxima.dia)} às ${proxima.hora}`
    : null;

  const telefone = def.contact_phone;
  const instagram = def.instagram?.replace(/^@/, "");

  return (
    <>
      <Splash />
      <Cabecalho />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-12 px-5 pt-1 pb-8">
        <section className="flex flex-col gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fotos/hero.jpg"
            alt="Mãos com verniz gel cor de ameixa (imagem ilustrativa)"
            width={900}
            height={678}
            fetchPriority="high"
            decoding="async"
            className="h-[250px] w-full rounded-3xl bg-blush object-cover"
          />
          <h1 className="font-display text-[40px] leading-11 font-semibold text-balance">
            Mãos cuidadas, com tempo para si.
          </h1>
          <p className="text-lg leading-7 text-muted-foreground">
            Manicure e unhas de gel. Escolhe o serviço e a hora em menos de um
            minuto.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/marcar" className={botao}>
              Marcar
            </Link>
            {textoProxima ? (
              <p className="tabular flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock aria-hidden className="size-4 text-success" />
                Próxima hora livre: {textoProxima}
              </p>
            ) : null}
          </div>
        </section>

        {servicos.length ? (
          <section aria-labelledby="servicos" className="flex flex-col gap-3">
            <h2
              id="servicos"
              className="mb-1 font-display text-[26px] leading-[30px] font-semibold"
            >
              Serviços
            </h2>
            {servicos.map((s) => (
              <ServiceCard
                key={s.id}
                id={s.id}
                nome={s.name}
                precoCents={s.price_cents}
                fotoUrl={s.photo_url}
              />
            ))}
          </section>
        ) : null}

        <section aria-labelledby="onde" className="flex flex-col gap-3">
          <h2
            id="onde"
            className="font-display text-[26px] leading-[30px] font-semibold"
          >
            Onde estamos
          </h2>
          {def.address ? <MiniMapa morada={def.address} /> : null}
          <div className="rounded-lg border border-border bg-card px-4 py-1">
            {def.address ? (
              <Linha icone={<MapPin aria-hidden />}>
                <span className="whitespace-pre-line">{def.address}</span>
              </Linha>
            ) : null}
            {horario.length ? (
              <Linha icone={<Clock aria-hidden />}>
                <span className="tabular">
                  {horario.map((l, i) => (
                    <span
                      key={l}
                      className={i ? "block text-muted-foreground" : "block"}
                    >
                      {l}
                    </span>
                  ))}
                </span>
              </Linha>
            ) : null}
            {instagram ? (
              <Linha icone={<AtSign aria-hidden />}>
                <a
                  href={`https://www.instagram.com/${instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-foreground no-underline"
                >
                  @{instagram}
                </a>
              </Linha>
            ) : null}
            {telefone ? (
              <Linha icone={<Phone aria-hidden />}>
                <a
                  href={`tel:${telefone.replace(/\s/g, "")}`}
                  className="tabular inline-flex min-h-11 items-center text-foreground no-underline"
                >
                  {telefone}
                </a>
              </Linha>
            ) : null}
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
