import Link from "next/link";

import { NavPainel } from "@/components/admin/nav-painel";
import { BotaoSair } from "@/components/marca/botao-sair";
import { Logo } from "@/components/marca/logo";
import { exigirAdmin } from "@/lib/auth";

export const metadata = {
  title: "Painel | Catarina Neves Nails Studio",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function LayoutPainel({
  children,
}: LayoutProps<"/admin">) {
  await exigirAdmin("/admin");
  return (
    <div className="flex min-h-full flex-1 flex-col pb-20 md:pb-0">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-5">
          <Link
            href="/admin"
            className="flex min-h-11 items-center gap-2 text-foreground no-underline"
          >
            <Logo size={30} />
            <span className="font-display text-lg font-semibold">Painel</span>
          </Link>
          <div className="hidden md:block">
            <NavPainel />
          </div>
          <BotaoSair />
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-5 pt-5 pb-8">
        {children}
      </div>
      <div className="md:hidden">
        <NavPainel />
      </div>
    </div>
  );
}
