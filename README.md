# Catarina Neves Nails Studio

App de marcações (Next.js, Tailwind v4, shadcn/ui, Cloudflare Workers). Plano em [PLANO.md](PLANO.md).

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm build
pnpm preview      # build OpenNext + preview local em workerd
```

## Deploy (Cloudflare Workers)

Precisa de conta Cloudflare e de login único (não feito pelo CI):

```bash
pnpm wrangler login
pnpm run deploy       # build OpenNext + publicação em https://catt-nailstudio.catt-nailstudio.workers.dev
```

Secrets (a partir de M1): `pnpm wrangler secret put NOME`. Valores locais em `.env.local` (ver `.env.example`).

## Identidade

Logótipo: imagem original em `brand/` (nunca vetorizar). `public/logo-cn-384.png` é só o recorte redimensionado para a web.
