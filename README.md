# Catarina Neves Nails Studio

App de marcações (Next.js, Tailwind v4, shadcn/ui, Vercel). Plano em [PLANO.md](PLANO.md).

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm build
```

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
