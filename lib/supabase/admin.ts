import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Chave secreta: ignora RLS. Só para Server Actions e páginas do servidor,
// depois de validar a identidade e os dados.
export function supabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
