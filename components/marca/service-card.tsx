import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { precoEmEuros } from "@/lib/datas";

// Foto de reserva (imagens ilustrativas) quando o serviço ainda não tem foto própria.
function fotoPadrao(nome: string): string | null {
  const n = nome.toLowerCase();
  if (n.includes("remo")) return "/fotos/remocao-gel.jpg";
  if (n.includes("manuten")) return "/fotos/manutencao-gel.jpg";
  if (n.includes("pedicure") && n.includes("completa")) return "/fotos/pedicure-completa.jpg";
  if (n.includes("pedicure")) return "/fotos/pedicure-normal.jpg";
  if (n.includes("verniz")) return "/fotos/manicure-verniz-gel.jpg";
  if (n.includes("gel")) return "/fotos/manicure-gel.jpg";
  return null;
}

export function ServiceCard({
  id,
  nome,
  descricao,
  precoCents,
  fotoUrl,
}: {
  id: string;
  nome: string;
  descricao?: string;
  precoCents: number;
  fotoUrl?: string | null;
}) {
  const foto = fotoUrl ?? fotoPadrao(nome);
  return (
    <Link
      href={`/marcar?servico=${id}`}
      className="flex min-h-20 items-center gap-3.5 rounded-lg border border-border bg-card py-3 pr-3.5 pl-4 text-card-foreground no-underline shadow-card transition-colors hover:bg-accent active:bg-accent"
    >
      {foto ? (
        // Decorativa: o nome do serviço já está no texto do cartão.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={foto}
          alt=""
          width={72}
          height={72}
          loading="lazy"
          decoding="async"
          className="size-[72px] shrink-0 rounded-md bg-secondary object-cover"
        />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-display text-[22px] leading-[26px] font-semibold">
          {nome}
        </span>
        {descricao ? (
          <span className="text-sm leading-5 text-muted-foreground">
            {descricao}
          </span>
        ) : null}
        <span className="tabular text-sm font-semibold">
          {precoEmEuros(precoCents)}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-primary" />
    </Link>
  );
}
