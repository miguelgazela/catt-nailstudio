import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

// Leituras públicas (RLS). Só corre no servidor: o browser nunca fala com o Supabase.
export function supabasePublico() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
