import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";

// Cliente com a sessão da pessoa (cookies). Respeita o RLS: só vê o que é seu.
// Para escrever como servidor usa `supabaseAdmin()`, depois de verificar quem é.
export async function supabaseSessao() {
  const jar = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(lista) {
          try {
            for (const { name, value, options } of lista) {
              jar.set(name, value, options);
            }
          } catch {
            // Server Components não escrevem cookies: o proxy renova a sessão.
          }
        },
      },
    },
  );
}
