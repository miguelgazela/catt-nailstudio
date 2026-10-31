"use client";

import {
  CalendarDays,
  Clock,
  type LucideIcon,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITENS = [
  {
    href: "/admin",
    rotulo: "Agenda",
    Icone: CalendarDays,
    base: ["/admin/semana", "/admin/marcacao", "/admin/nova"],
  },
  { href: "/admin/clientes", rotulo: "Clientes", Icone: Users, base: [] },
  { href: "/admin/servicos", rotulo: "Serviços", Icone: Sparkles, base: [] },
  { href: "/admin/horario", rotulo: "Horário", Icone: Clock, base: [] },
  {
    href: "/admin/definicoes",
    rotulo: "Definições",
    Icone: Settings,
    base: [],
  },
];

function ativo(p: string, href: string, base: string[]) {
  if (href === "/admin") {
    return p === "/admin" || base.some((b) => p.startsWith(b));
  }
  return p.startsWith(href);
}

// Dentro do <Link>: `pending` fica true no instante do toque, por isso a tab marca-se logo,
// mesmo antes de o servidor responder (como numa app nativa).
function Conteudo({
  Icone,
  rotulo,
  atual,
}: {
  Icone: LucideIcon;
  rotulo: string;
  atual: boolean;
}) {
  const { pending } = useLinkStatus();
  const marcada = atual || pending;
  return (
    <>
      <span
        className={cn(
          "flex h-[30px] w-14 items-center justify-center rounded-full transition-colors duration-150 md:hidden",
          marcada && "bg-secondary text-primary",
        )}
      >
        <Icone aria-hidden className="size-[22px]" />
      </span>
      <Icone aria-hidden className="hidden size-5 md:block" />
      <span className={cn(marcada && "font-bold text-primary")}>{rotulo}</span>
    </>
  );
}

export function NavPainel() {
  const p = usePathname();
  return (
    <nav
      aria-label="Painel"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pt-1.5 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] shadow-bar md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none"
    >
      <ul className="mx-auto flex max-w-xl md:max-w-none md:gap-1">
        {ITENS.map(({ href, rotulo, Icone, base }) => {
          const a = ativo(p, href, base);
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={a ? "page" : undefined}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-xs font-semibold text-muted-foreground no-underline md:min-h-11 md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-sm",
                  a && "text-primary md:bg-secondary",
                )}
              >
                <Conteudo Icone={Icone} rotulo={rotulo} atual={a} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
