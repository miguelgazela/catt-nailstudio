# Catarina Neves Nails Studio

App de marcações (Next.js, Tailwind v4, shadcn/ui, Vercel). Plano em [PLANO.md](PLANO.md).

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm build
```

## Base de dados (Supabase)

Precisa de Docker. Portas locais deslocadas (544xx) para não colidir com outros projetos.

```bash
pnpm dlx supabase start -x studio,imgproxy,vector,logflare,edge-runtime,realtime,storage-api,supavisor,mailpit,postgres-meta
pnpm dlx supabase db reset    # recria a BD local com migrations e seed
pnpm dlx supabase test db     # testes pgTAP em supabase/tests/database
```

Migrations em `supabase/migrations`. Só vão para a nuvem (`supabase db push`) depois de passarem em local e no CI.

## Deploy (Vercel)

Primeira vez, com a conta Vercel (plano Hobby):

```bash
pnpm dlx vercel login
pnpm dlx vercel link        # cria o projeto
pnpm dlx vercel --prod      # deploy de produção
```

Depois, ligar o repositório GitHub no dashboard da Vercel: cada push em `main` faz deploy. Região das funções: `fra1` (Frankfurt, ver `vercel.json`). Variáveis de ambiente no dashboard (Settings > Environment Variables); valores locais em `.env.local` (ver `.env.example`).

O plano Hobby é só para uso não comercial. Se a Vercel bloquear o projeto, passar ao Pro.

## Identidade

Logótipo: imagem original em `brand/` (nunca vetorizar). `public/logo-cn-384.png` é só o recorte redimensionado para a web.
