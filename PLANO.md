# Catarina Neves Nails Studio — App de Marcações

Plano v1. Uma profissional, marcações online, sem pagamentos.

Estado (30 out 2026): identidade e mockups da cliente e do painel feitos (secção 6). Próximo passo: desenvolvimento (secção 10).

## 1. Decisões tomadas

| Tema | Decisão |
|---|---|
| Plataforma | Web app / PWA (link no Instagram/WhatsApp, instalável no ecrã inicial) |
| Confirmação | Automática. Cliente vê só horários livres |
| Login | Híbrido: conta com email + magic link **ou** convidada (nome + telemóvel) com limites |
| Pagamentos | Nenhum na v1. Paga no estúdio |
| Equipa | Só a Catarina (uma agenda) |
| Avisos | Email (confirmação, lembrete 24h, cancelamento) + botão "Adicionar ao calendário" (.ics / Google) |
| Cancelamento | Cliente cancela até 24h antes. Depois disso, contacta o estúdio |
| Serviços | Um serviço por marcação, preço fixo. **Todas as marcações duram 1 hora** |
| Horário | Seg a sex 9:00–12:00 e 14:30–18:30; sáb 9:00–13:00; dom fechado (segunda aberta e domingo fechado por confirmar). Horas de início: 9:00, 10:00, 11:00, 14:30, 15:30, 16:30, 17:30 (sáb: 9:00, 10:00, 11:00, 12:00) |
| Limite sem conta | 1 marcação futura por telemóvel |
| Antecedência | Configurável: mínimo (ex: 2h) e máximo (ex: 6 semanas) |
| Stack | Next.js (App Router) + Supabase (Postgres, Auth, RLS) |
| Alojamento | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`). Plano grátis permite uso comercial |
| Domínio/DNS | Registado e gerido no Cloudflare |
| Branding | Direção "Nude & Ameixa", logótipo original do Higgsfield. Ver secção 6.1 |
| UI | Tailwind v4 + shadcn/ui com os tokens do Design System. Mobile-first, PT-PT, AA |

## 2. Utilizadoras e fluxos

### Cliente com conta
1. Abre link → escolhe serviço → escolhe dia/hora livre.
2. Entra com email (magic link) — pode ser antes ou no fim do fluxo.
3. Confirma → email de confirmação + botão calendário.
4. Área "As minhas marcações": próximas, histórico, cancelar (até 24h antes), remarcar (= cancelar + nova).

### Cliente convidada (sem conta)
1. Mesmo fluxo, no fim preenche nome + telemóvel (+ email opcional).
2. Limites:
   - Máx. **1 marcação futura** por telemóvel.
   - Se deu email: recebe confirmação com link de cancelamento (token único). Sem email: cancela só contactando o estúdio.
   - Anti-spam: Cloudflare Turnstile (invisível) + rate limit por IP.
   - Número bloqueado pela Catarina → não consegue marcar.
3. Se mais tarde criar conta e indicar o mesmo telemóvel → marcações antigas associadas à conta.

### Catarina (admin)
- **Agenda** dia/semana: ver, criar (marcações por DM/telefone), mover, cancelar, marcar falta.
- **Horário e folgas**: horário semanal, pausas (almoço), férias, bloquear horas soltas.
- **Serviços**: nome, descrição, preço, foto, ativo/inativo, ordem (duração fixa de 1 h).
- **Clientes**: ficha com contacto, histórico, notas (alergias, preferências), nº de faltas, bloquear.
- **Definições**: antecedência mín./máx., texto de política, contactos/morada. (Duração fixa de 1 h, sem intervalo entre marcações.)

## 3. Arquitetura

```
Next.js (Cloudflare Workers + OpenNext, deploy via Workers Builds)
 ├─ /            página pública: serviços, sobre, contactos
 ├─ /marcar      fluxo de marcação (serviço → dia → hora → dados → confirmar)
 ├─ /conta       marcações da cliente
 ├─ /cancelar/[token]  cancelamento convidada
 └─ /admin       painel Catarina (login email, role admin)

Supabase
 ├─ Postgres + RLS
 ├─ Auth (magic link)
 ├─ RPC/Server Actions para criar marcação (validação no servidor)
 ├─ Storage → fotos dos serviços (otimizadas antes do upload)
 └─ pg_cron → lembretes 24h

Resend (ou Brevo) → emails transacionais
Cloudflare Turnstile → anti-spam no formulário de convidada
```

Regras de alojamento (manter app portável e dentro dos limites):
- Lógica de dados, cron e ficheiros no Supabase, não em serviços do alojamento.
- Sem otimização `next/image` em runtime: imagens otimizadas antes do upload (ou loader próprio).
- Sem ISR. Páginas dinâmicas ou estáticas simples.
- Dependências leves: limite de bundle de 3 MiB comprimido no plano grátis.
- Limite de ~10ms CPU por pedido no grátis (espera por rede não conta). Se excedido → Workers Paid (5$/mês).
- Secrets via `wrangler secret` / dashboard. Config em `wrangler.jsonc` com `nodejs_compat`.

Fuso horário fixo: `Europe/Lisbon`. Guardar `timestamptz`, mostrar sempre em hora de Lisboa.

## 4. Modelo de dados (rascunho)

- `settings` — linha única: antecedência mín./máx. (minutos), janela cancelamento (24h), contactos, texto políticas. Duração da marcação fixa: 60 min (constante, não por serviço).
- `services` — id, nome, descrição, preço_cents, foto_url, ativo, ordem.
- `weekly_hours` — dia_semana, início, fim (várias linhas por dia para pausas).
- `time_off` — início, fim, motivo (férias, bloqueio pontual).
- `clients` — id, user_id (nullable), nome, telemóvel (normalizado E.164), email, notas, bloqueado, nº_faltas.
- `appointments` — id, client_id, service_id, início, fim, estado (`confirmed`/`cancelled`/`no_show`/`done`), origem (`online`/`admin`), cancel_token, preço copiado do serviço no momento (fim = início + 60 min), nota (ex.: "marcou pelo Instagram"), cancelado_por, criado_em.
- `admins` — user_id. Quem pode entrar no painel (só a Catarina, e o Miguel enquanto houver manutenção).

Regras críticas no Postgres (não só no frontend):
- **Sem sobreposições**: `EXCLUDE USING gist (tstzrange(inicio, fim) WITH &&) WHERE estado = 'confirmed'` (extensão `btree_gist`). Duas clientes no mesmo segundo → só uma ganha.
- **Limite convidada**: verificado na função de criação (1 marcação futura confirmada por telemóvel sem conta).
- **Cancelamento 24h**: verificado no servidor.
- RLS: cliente só vê as suas; admin vê tudo; público só lê serviços e disponibilidade.

Cálculo de disponibilidade (servidor): cada período de `weekly_hours` é cortado em slots de 60 min a contar do seu início (9:00, 10:00, 11:00; 14:30, 15:30, 16:30, 17:30), menos `time_off` e marcações confirmadas, dentro da janela mín./máx. Sem buffer.

## 5. Fases

| # | Fase | Resultado | Estado |
|---|---|---|---|
| 0 | Recolher info da Catarina (secção 7) | Serviços, horários, regras reais | Em curso: horário respondido, faltam serviços, preços e contactos |
| 1 | **Claude Design** (brief secção 6) | Identidade + ecrãs mobile cliente e admin | Feito, exceto template de email |
| 2–7 | Desenvolvimento, lançamento e piloto | App online | Detalhado na secção 10 (M0 a M8). **M0 feito** (30 out 2026), online em `workers.dev` |

Fora da v1 (backlog): sinal/pagamento online (MB Way/Stripe), SMS/WhatsApp, lista de espera, extras/combos de serviços, galeria de trabalhos, reviews, várias profissionais, estatísticas.

## 6. Brief para Claude Design (concluído)

Entregáveis 1 a 3 feitos (resultado em 6.1). Falta o 4, template de email, que passa para M5. Mudança face ao brief: o cartão de serviço já não mostra duração (todas têm 1 hora).

**Marca:** Catarina Neves Nails Studio. Estúdio de manicure, uma profissional. Clientes maioritariamente mulheres, chegam pelo Instagram.

**Tom:** acolhedor, cuidado, premium acessível. Limpo, não "salão genérico rosa choque".

**Entregáveis:**
1. Identidade: logótipo/monograma (CN?), paleta, tipografia, ícone PWA.
2. Ecrãs cliente (mobile-first, ~390px):
   - Página inicial (hero, serviços, sobre, localização/contactos, CTA "Marcar")
   - Escolher serviço (cartão: nome, duração, preço, foto)
   - Escolher dia (calendário, dias sem vagas desativados) + horas livres
   - Dados: entrar com email **ou** continuar como convidada (nome, telemóvel, email opcional)
   - Confirmação (resumo, adicionar ao calendário, política cancelamento)
   - As minhas marcações (próximas / histórico, cancelar)
   - Estados: sem vagas, erro "horário acabou de ser ocupado", número bloqueado, limite convidada
3. Painel admin (mobile primeiro — ela usa no telemóvel entre clientes; desktop secundário):
   - Agenda dia e semana, detalhe da marcação, nova marcação manual
   - Horário semanal + folgas/férias
   - Lista e edição de serviços
   - Lista de clientes + ficha
   - Definições
4. Email de confirmação/lembrete (template simples).

**Restrições:** PT-PT, acessível (contraste AA, alvos de toque ≥44px), componentes realistas para Tailwind/shadcn.

## 6.1 Identidade e mockups (resultado)

Escolhida a direção A, **Nude & Ameixa**: editorial, acolhedora, premium acessível.

- Design System: https://claude.ai/artifact/H5nbhM6N2pAQUMZnyjZ8xg
- Canvas de exploração (direções A–D, logótipos): https://claude.ai/artifact/L5rLWGMHQs7R14qnneRuwU
- Mockups dos ecrãs da cliente (fluxo de marcação, as minhas marcações, estados): https://claude.ai/artifact/PxcWT1VmYHm159P4CdyrQ8
- Mockups do painel de gestão (agenda, marcação manual, horário, serviços, clientes, definições, vista em computador): https://claude.ai/artifact/6eQeeFeAutpNiU2kCoENb5
- Logótipo: imagem original do Higgsfield (unha squoval ameixa com CN em itálico). Ficheiros em `brand/logo-cn.png` (1024 px) e `brand/logo-cn-crop.png` (680 px, uso na app). Falta versão sem fundo para modo escuro.
- Tipografia: Cormorant Garamond 600 (títulos, nomes de serviço, ≥20px) + Manrope 400–700 (texto e UI, corpo 16px).
- Raios: 10 (horas/dias), 12 (campos), 16 (cartões), 24 (folhas), pílula (botões/badges). Espaço em escala de 4 pt, margem lateral 20px.
- Ecrã de abertura (PWA): logótipo grande centrado sobre `#F7F1EC`, nome em Cormorant e três pontos de carregamento. No `manifest.webmanifest`: `background_color: "#F7F1EC"`, `theme_color: "#7A3B52"`, ícones a partir de `brand/logo-cn-crop.png`. No iOS, gerar `apple-touch-startup-image` com o mesmo desenho. Só aparece no arranque a frio: nunca atrasar de propósito a página inicial.
- Mockups e ecrãs seguintes: usar as skills `ui-ux-pro-max` e `frontend-design`.

| Token | Claro | Escuro |
|---|---|---|
| background | #F7F1EC | #1C1418 |
| foreground | #2E1F26 | #F5ECE8 |
| card | #FFFFFF | #271C21 |
| primary | #7A3B52 | #E3A9BC |
| primary-foreground | #FFFFFF | #2E1F26 |
| secondary / accent | #F1E6DF | #33252B |
| muted-foreground | #6B5A60 | #BFAEB3 |
| border | #E6D9D1 | #3A2B31 |
| input | #9C8A91 | #8A747C |
| destructive | #B3261E | #F2A39B |
| nude / blush (decoração) | #D9B8A7 / #F1D9CC | #8C6556 / #4A3038 |

O `globals.css` completo para Tailwind v4 + shadcn (`:root`, `.dark`, `@theme inline`) está no README do Design System.

## 7. Perguntas para a Catarina

- Lista de serviços: nome, preço, descrição curta. Tem fotos?
- Confirmar: segunda-feira aberta e domingo fechado?
- ~~Horário semanal real? Pausa de almoço? Dias fixos de folga?~~ Respondido: ver Decisões (domingo fechado assumido).
- ~~Precisa de intervalo entre clientes?~~ Não: marcações fixas de 1 h.
- Antecedência mínima e máxima que quer?
- Morada, telefone, Instagram, como chegar/estacionamento.
- Como recebe marcações hoje (DMs, telefone, caderno, app)? Há marcações futuras a importar?
- Faltas são problema frequente? (decide se sinal entra cedo no backlog)
- Que email/domínio quer (ex: `marcacoes@catarinanevesnails.pt`)?
- Fotos dela/estúdio para página "Sobre"?
- Aceita marcações de menores de 16 anos?
- Já tem entidade de RAL e Livro de Reclamações Eletrónico registado?

## 8. Custos estimados

| Item | Custo |
|---|---|
| Supabase free | 0€ (pausa após 7 dias sem atividade — marcações regulares evitam) |
| Hosting | Cloudflare Workers grátis (uso comercial permitido). Se limites de CPU/bundle apertarem → Workers Paid 5$/mês |
| Email (Resend free) | 0€ até 3000/mês, 100/dia |
| Turnstile | 0€ |
| Domínio .pt | ~10-20€/ano |

Nota: alternativas prontas (Fresha, Booksy, Treatwell) existem; Fresha é grátis para marcações. Vantagem desta app: marca própria, sem comissões, controlo total.

## 9. Riscos / atenção

- **RGPD e segurança**: detalhado na secção 11. Dados de saúde ficam fora da app; o risco que sobra é a Catarina escrevê-los nas notas por hábito.
- **Concorrência**: dupla marcação resolvida na BD (exclusion constraint), não no frontend.
- **Limites Cloudflare grátis**: deploy de teste cedo (fase 2) para medir bundle e CPU antes de crescer a app.
- **Fuso/hora de verão**: testar dias de mudança de hora (março/outubro).
- **Email em spam**: configurar SPF/DKIM/DMARC no domínio.
- **Dependência de uma pessoa**: se a Catarina não atualizar folgas, clientes marcam em dias fechados → tornar bloquear dia muito rápido no painel.

## 10. Plano de desenvolvimento

Rascunho para discutir. As estimativas são em dias de trabalho focado e servem só para ordenar. Cada etapa (M0 a M8) termina com algo a funcionar e publicado no ambiente de testes.

### 10.1 Antes de começar

Contas e acessos (Miguel):
- Repositório GitHub privado.
- Supabase: dois projetos, `staging` e `prod`. Supabase CLI local (Docker) para desenvolvimento.
- Cloudflare: conta, Workers, Turnstile (site key de testes e de produção).
- Resend: conta e, mais tarde, domínio verificado.

Respostas da Catarina que bloqueiam etapas (secção 7):
- Lista de serviços com preços → M2 (com placeholders até lá).
- Antecedência mínima e máxima → M1 (valores por omissão: 2 h e 6 semanas).
- Morada, telefone, Instagram → M2.
- Domínio e email de envio → M7.
- Segunda aberta, domingo fechado → M1 (seed do horário).

Design ainda em falta (não bloqueia M0 a M4):
- Template de email de confirmação e lembrete → M5.
- Logótipo sem fundo para modo escuro, PNG de ícones PWA e splash iOS → M6.

### 10.2 Decisões técnicas

| Tema | Decisão |
|---|---|
| Linguagem | TypeScript em modo `strict` |
| Gestor de pacotes | pnpm |
| Framework | Next.js estável atual, App Router, Server Components e Server Actions |
| UI | Tailwind v4 + shadcn/ui. `globals.css` do Design System. Fontes com `next/font/google` (Cormorant Garamond, Manrope) |
| Ícones | Lucide (traço 2px) |
| Validação | zod nos formulários e nas Server Actions |
| Datas | Tudo em `Europe/Lisbon` com `@date-fns/tz`. Na BD, `timestamptz` |
| Dados | `@supabase/ssr`. Escrita sensível só por funções SQL (`security definer`) chamadas pelo servidor |
| Disponibilidade | Calculada no Postgres (função SQL), não em JavaScript, para o browser e o servidor verem o mesmo |
| Admin | Tabela `admins` + verificação no middleware e nas políticas RLS |
| Estado do fluxo de marcação | Na URL (`/marcar?servico=…&dia=…&hora=…`), para o botão voltar funcionar e o link poder ser partilhado |
| Imagens | Redimensionadas no browser antes do upload (WebP, 800 px). Sem `next/image` em runtime |
| Testes | Vitest (lógica), pgTAP via `supabase test db` (regras SQL), Playwright (fluxos principais) |
| CI | GitHub Actions: lint, typecheck, testes, build OpenNext. Deploy por Workers Builds (`main` → staging; tag → prod) |
| Erros | Logs do Cloudflare + página de erro própria. Sentry só se for preciso |

Estrutura de pastas proposta:

```
app/
  (publico)/page.tsx            início
  (publico)/marcar/...          serviço → dia e hora → dados → confirmação
  (publico)/cancelar/[token]/   cancelamento de convidada
  conta/                        as minhas marcações
  admin/                        agenda, clientes, serviços, horário, definições
components/ui/                  shadcn com os tokens da marca
components/marca/               Logo, ServiceCard, TimeSlot, CalendarDay, StatusBadge
lib/                            supabase, datas, validação, emails, ics
supabase/migrations/            esquema, RLS, funções
supabase/tests/                 pgTAP
emails/                         templates
brand/                          logótipo original e recorte
```

### 10.3 Etapas

**M0. Fundações** (1–2 dias) — **feito a 30 out 2026** (falta só medir CPU e fazer push)
- Criar o projeto Next.js com TypeScript, Tailwind v4, shadcn/ui, ESLint e Prettier.
- Aplicar os tokens do Design System (`globals.css`), fontes e logótipo. Página "em breve" com a marca.
- OpenNext + `wrangler.jsonc` (`nodejs_compat`) e primeiro deploy em `*.workers.dev`.
- CI no GitHub Actions.
- Segurança base: cabeçalhos HTTP (CSP, HSTS, etc.), Dependabot, secrets fora do repositório. Supabase criado numa região da UE.
- Feito quando: a página "em breve" está online e o CI passa. Tamanho do bundle e CPU por pedido medidos e anotados aqui.

Resultado do M0 (commit inicial local, sem remote):
- Next.js 16.4.3 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4, shadcn/ui (Button, estilo `base-nova` com base-ui, adaptado: pílula, alvos de 44 px), ESLint + Prettier, pnpm 10.
- Tokens do DS em `app/globals.css` (claro e escuro), fontes Cormorant Garamond (500/600) e Manrope (400–700) via `next/font/google`, `lang="pt-PT"`. Página "em breve" com `public/logo-cn-384.png` (recorte original redimensionado, não vetorizado).
- OpenNext + `wrangler.jsonc` (`nodejs_compat`); scripts `preview` e `deploy`. `opennextjs-cloudflare build` e `wrangler deploy --dry-run` passam.
- Cabeçalhos em `next.config.ts` (CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors none), Dependabot, `.env.example`, CI (`.github/workflows/ci.yml`: install, lint, typecheck, build).
- **Medições**: first load JS da página inicial ≈ 176 KiB comprimido (gzip), 570 KiB sem comprimir, mais 5 KiB de CSS. Worker OpenNext: 4,6 MiB sem comprimir, **984 KiB comprimido** (limite grátis 3 MiB). CPU por pedido: por medir, só com o deploy.
- **Deploy feito** a 30 out 2026: https://catt-nailstudio.catt-nailstudio.workers.dev (arranque do Worker 16 ms). O certificado do subdomínio novo demorou alguns minutos a ativar. Nota: `pnpm deploy` é um comando nativo do pnpm; usar `pnpm run deploy`.
- **Por fazer** (precisa do Miguel): ler o CPU por pedido no dashboard Cloudflare (Workers & Pages > catt-nailstudio > Metrics) e anotar aqui; criar o repositório GitHub e fazer push para o CI correr; criar os projetos Supabase na UE. A CSP usa `'unsafe-inline'` nos scripts: rever com nonces ao juntar Turnstile e Supabase (M2).
- Nota de ferramentas: `pnpm` instalado globalmente (corepack estava avariado nesta máquina).

**M1. Base de dados e regras** (2–3 dias)
- Migrations: `settings`, `services`, `weekly_hours`, `time_off`, `clients`, `appointments`, `admins`. Enums para estado e origem.
- `btree_gist` + exclusion constraint contra sobreposições.
- Funções SQL:
  - `available_slots(de, ate)`: slots de 60 min a contar do início de cada período, menos folgas e marcações, dentro da antecedência.
  - `book_appointment(servico, inicio, nome, telemovel, email?)`: valida que o slot existe e está livre, número não bloqueado, limite de 1 marcação futura sem conta; cria ou reutiliza a cliente pelo telemóvel (E.164); devolve erros com código (`slot_taken`, `blocked`, `guest_limit`, `outside_window`).
  - `cancel_appointment(id | token)`: regra das 24 h para clientes; a admin pode sempre.
- RLS: público lê serviços ativos e disponibilidade; cliente lê as suas; admin lê e escreve tudo.
- Seed: horário real, 3 serviços de exemplo, definições por omissão.
- Privacidade na BD: tokens de cancelamento guardados como hash, tabela `audit_log` com as ações da admin, função de anonimização e `pg_cron` mensal para clientes inativas há 24 meses.
- Testes pgTAP: dupla marcação, limite sem conta, número bloqueado, 24 h, mudança de hora (último domingo de março e de outubro), e RLS: uma cliente não vê dados de outra, o público não lê `clients`.
- Feito quando: os testes SQL passam em local e no CI.

**M2. Página inicial e marcação sem conta** (3–4 dias)
- Ecrã de abertura (só no arranque a frio), página inicial, escolher serviço, escolher dia e hora, os seus dados, confirmação, como nos mockups.
- Componentes da marca: `Logo`, `ServiceCard`, `TimeSlot`, `CalendarDay`, `StatusBadge`.
- Turnstile e rate limit por IP e por telemóvel no formulário.
- Texto informativo de privacidade no ecrã de dados (sem "aceito"), rodapé com Privacidade, Termos e Livro de Reclamações.
- Estados de erro: hora acabou de ser ocupada, mês sem vagas, número bloqueado, limite sem conta.
- Playwright: marcar como convidada do início ao fim; duas marcações na mesma hora ao mesmo tempo, só uma ganha.
- Feito quando: uma pessoa consegue marcar no telemóvel em staging e a marcação aparece na BD.

**M3. Conta da cliente** (2 dias)
- Entrar com link por email (Supabase Auth), em qualquer ponto do fluxo.
- "As minhas marcações": próximas, anteriores, cancelar até 24 h antes.
- Associar marcações antigas sem conta ao criar conta com o mesmo telemóvel.
- Página `/cancelar/[token]` para convidadas com email.
- "Os meus dados": editar, exportar e apagar conta.
- Mensagens que não revelam se um email tem conta.
- Feito quando: o fluxo com conta e o cancelamento funcionam em staging, com testes Playwright.

**M4. Painel da Catarina** (4–5 dias)
- Entrada e proteção do `/admin`, com MFA obrigatório e sessão que expira.
- Na ficha: exportar dados da cliente, apagar ou anonimizar. Aviso no campo de notas para não registar dados de saúde.
- Registo de alterações (`audit_log`) visível na marcação.
- Agenda do dia (lista de horas) e da semana, detalhe da marcação: mover, cancelar, marcar falta.
- Nova marcação manual, com opção de hora fora do horário.
- Horário semanal, bloqueios e férias.
- Serviços: lista, ordem (botões, não só arrastar), editar, foto, ativo/inativo.
- Clientes: pesquisa, filtros, ficha com notas, histórico e bloqueio.
- Definições.
- Vista de computador da semana.
- Feito quando: a Catarina consegue gerir uma semana fictícia sozinha no telemóvel (teste com ela).

**M5. Emails e calendário** (2 dias)
- Desenhar o template de email (confirmação, lembrete, cancelamento) com as skills de design.
- Envio por Resend a partir do servidor.
- `.ics` e link "Adicionar ao Google Calendar".
- Lembrete 24 h antes: `pg_cron` + Edge Function do Supabase.
- Aviso à Catarina de novas marcações (se ativo nas definições).
- Feito quando: marcar, cancelar e o lembrete enviam os emails certos em staging.

**M6. PWA e acabamentos** (1–2 dias)
- `manifest.webmanifest`, ícones PNG (192, 512, maskable, apple-touch) a partir do recorte do logótipo, splash iOS.
- Página offline simples.
- Modo escuro só se houver logótipo sem fundo; senão fica para depois.
- Revisão de acessibilidade (teclado, leitor de ecrã, contraste) e Lighthouse no telemóvel.
- Feito quando: a app instala-se no iPhone e no Android e passa a revisão.

**M7. Lançamento** (1–2 dias)
- Domínio no Cloudflare, SPF, DKIM e DMARC para o email.
- Política de privacidade, termos e condições, link do Livro de Reclamações e entidade RAL (secção 11). Rever com alguém da área.
- DPA aceites (Supabase, Cloudflare, Resend), registo de atividades de tratamento e plano de incidentes em `docs/rgpd/`.
- Revisão de segurança antes de abrir: RLS, secrets, cabeçalhos, MFA da Catarina.
- Projeto Supabase de produção, backups, seed com os serviços e preços reais.
- Importar marcações futuras que a Catarina já tenha.
- Feito quando: a app está no domínio final com dados reais.

**M8. Piloto** (2 semanas de uso)
- 5 a 10 clientes de confiança marcam a sério.
- Recolher problemas, corrigir e só depois pôr o link no Instagram.

Total estimado de desenvolvimento: cerca de 18 a 25 dias de trabalho (inclui as tarefas de privacidade e segurança da secção 11), mais o piloto.

### 10.4 Ordem e dependências

```
M0 → M1 → M2 → M3
            ↘
             M4 → M5 → M6 → M7 → M8
```

M3 e M4 podem andar em paralelo depois de M2. M5 precisa do template de email. M7 precisa do domínio e dos dados reais da Catarina.

## 11. Privacidade, RGPD e segurança

A app guarda dados pessoais de clientes (nome, telemóvel, email, histórico de marcações e notas). Isto é a base do que é preciso cumprir. Não substitui aconselhamento jurídico: antes do lançamento, rever a política de privacidade com alguém da área ou com os modelos da CNPD.

### 11.1 Papéis e fornecedores

- **Responsável pelo tratamento**: a Catarina (o estúdio). É quem responde às clientes e à CNPD.
- **Subcontratantes**: Supabase (BD, autenticação, ficheiros), Cloudflare (alojamento, Turnstile), Resend (emails). Aceitar o DPA (acordo de tratamento de dados) de cada um e guardar cópia.
- **Dados na UE**: projeto Supabase numa região europeia (ex.: Frankfurt). Resend com região UE. Cloudflare serve globalmente, mas não guarda dados de clientes (fica tudo no Supabase).
- **Registo de atividades de tratamento**: uma página simples (que dados, para quê, quanto tempo, quem tem acesso). Guardar em `docs/rgpd/`.

### 11.2 Que dados, para quê e com que base legal

| Dado | Para quê | Base legal | Obrigatório |
|---|---|---|---|
| Nome, telemóvel | Fazer e gerir a marcação, contactar se houver mudança | Execução de contrato (a marcação) | Sim |
| Email | Confirmação, lembrete, link de cancelamento, conta | Execução de contrato | Não (só para quem tem conta) |
| Histórico de marcações, faltas | Gerir a agenda, decidir bloqueios | Interesse legítimo do estúdio | Automático |
| Notas da Catarina | Preferências de serviço | Interesse legítimo | Não |
| Alergias ou outros dados de saúde | **Não se registam** (decisão de 30 out 2026). A Catarina pergunta na hora | — | — |
| IP e sinais anti-spam | Proteger o formulário | Interesse legítimo | Automático, não guardado na BD |

Regras que saem daqui:
- **Minimização**: não pedir mais nada (sem data de nascimento, morada, NIF).
- **Sem marketing**: os emails são só de serviço. Se um dia houver newsletter, precisa de consentimento à parte, desmarcado por omissão.
- **"Aceito a política de privacidade" não é consentimento** para marcar. No ecrã de dados, trocar por uma frase informativa ("Usamos estes dados só para gerir a sua marcação. Saiba mais") com link para a política.
- **Dados de saúde**: a app não guarda alergias nem outros dados de saúde. As notas da ficha são só para preferências (formato, cores, horários). O campo de notas mostra o aviso "Não registe alergias nem dados de saúde".

### 11.3 Direitos das clientes

- **Saber e aceder**: página "Os meus dados" na conta, ou pedido por email. No painel, botão "Exportar dados" na ficha (JSON ou PDF simples).
- **Retificar**: a cliente edita nome, telemóvel e email na conta. A Catarina também, na ficha.
- **Apagar**: botão "Apagar cliente" na ficha (com confirmação). Apaga ou anonimiza (o histórico fica como "Cliente apagada" para as contas da agenda não mudarem). Na conta, "Apagar a minha conta".
- **Prazo de resposta**: 1 mês. Registar pedidos numa nota simples.

### 11.4 Prazos de conservação

- Clientes sem marcações há **24 meses**: anonimizar automaticamente (`pg_cron` mensal).
- Marcações canceladas e tokens de cancelamento: apagar o token quando a marcação passa.
- Logs técnicos: os do Cloudflare e Supabase, com a retenção por omissão (dias). Nunca registar telemóvel, email ou notas nos logs da app.
- Backups: os do Supabase (rotação automática). Um pedido de apagamento chega aos backups quando estes rodam. Explicar isso na política.

### 11.5 Segurança técnica

Acesso e autenticação:
- Painel só para quem está na tabela `admins`. **MFA (código de app autenticadora) obrigatório** para a conta da Catarina.
- Sessão do painel expira após inatividade (ex.: 12 horas). Botão "Sair" visível. Ela usa o telemóvel entre clientes, por isso o bloqueio do telemóvel é a primeira proteção: recomendar.
- Links de entrada por email com validade curta (Supabase: 1 hora) e uso único.
- A chave `service_role` do Supabase nunca vai para o browser. Só em secrets do servidor.

Dados na base de dados:
- RLS ativo em **todas** as tabelas, com testes pgTAP que provam que uma cliente não vê dados de outra e que o público não lê `clients`.
- Escrita sensível só por funções SQL com validação no servidor.
- Tokens de cancelamento aleatórios (32 bytes) e guardados como hash. O link no email tem o token, a BD só o hash.
- Telemóvel normalizado (E.164) para não haver duplicados.

Formulários e abuso:
- Turnstile e limite de pedidos por IP e por telemóvel.
- Mensagens que não revelem demasiado: "Este número não pode fazer marcações online" é aceitável, mas nunca mostrar se um email tem conta ("Se existir uma conta, enviámos um link").
- Validação com zod no servidor, mesmo que o browser já valide.
- Upload de fotos só para a admin, só imagens, tamanho máximo, ficheiro renomeado.

Plataforma:
- HTTPS sempre, HSTS, cabeçalhos de segurança (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
- Sem cookies de terceiros, sem analytics com rasto. Com só cookies essenciais (sessão), **não é preciso banner de cookies**. Mencionar na política (sessão e Turnstile). Se um dia houver analytics, usar uma opção sem cookies (ex.: Cloudflare Web Analytics) ou pedir consentimento.
- Dependabot ligado e atualizações regulares.
- Registo de alterações no painel (quem mudou ou cancelou o quê e quando) numa tabela `audit_log`. Ajuda em disputas ("eu não cancelei").

### 11.6 Incidentes

- Se houver fuga de dados: avisar a CNPD em **72 horas** e as clientes afetadas se o risco for alto.
- Plano curto em `docs/rgpd/incidentes.md`: quem decide, como revogar chaves, como avisar.

### 11.7 Outras obrigações em Portugal (a confirmar)

- **Livro de Reclamações Eletrónico**: negócios com presença online devem ter link visível para o livro eletrónico. Pôr no rodapé.
- **Resolução alternativa de litígios (RAL)**: indicar uma entidade de RAL no site (prestadores de serviços a consumidores). Pôr na página de termos.
- **Termos e condições** curtos: marcação, cancelamento até 24 h, faltas, pagamento no estúdio.
- **Menores**: definir se aceitam marcações de menores de 16 anos sem adulto. Se sim, ponderar pedir confirmação.
- **Acessibilidade**: o Ato Europeu de Acessibilidade isenta microempresas, mas o objetivo AA já está no design.

### 11.8 Mudanças nos mockups que daqui saem (feitas a 30 out 2026)

- Ecrã "Os seus dados": trocar "Ao confirmar aceita a política de privacidade" por texto informativo com link.
- Ficha da cliente: tirar as alergias do exemplo e pôr o aviso "Não registe alergias nem dados de saúde" no campo de notas.
- Conta da cliente: acrescentar "Os meus dados" (editar, exportar, apagar conta).
- Ficha da cliente no painel: acrescentar "Exportar dados" e "Apagar cliente".
- Rodapé da página inicial: links para Privacidade, Termos e Livro de Reclamações.
