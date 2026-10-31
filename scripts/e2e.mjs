// Corre os testes Playwright contra o Supabase local (precisa de `supabase start`).
// Usa as chaves de demonstração do CLI local e as chaves de teste do Turnstile (passam sempre).
import { execSync, spawnSync } from "node:child_process";

function supabase(args) {
  for (const cmd of ["supabase", "pnpm dlx supabase"]) {
    try {
      return execSync(`${cmd} ${args}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {}
  }
  throw new Error("Supabase CLI não encontrado");
}

const env = Object.fromEntries(
  supabase("status -o env")
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);

const r = spawnSync(
  "pnpm",
  ["exec", "playwright", "test", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: env.API_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: env.SERVICE_ROLE_KEY,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
      TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
      RATE_LIMIT_SALT: "e2e",
      CRON_SECRET: "e2e-cron",
      EMAIL_DRY_RUN: "1",
      SITE_URL: `http://localhost:${process.env.E2E_PORT ?? 3100}`,
    },
  },
);
process.exit(r.status ?? 1);
