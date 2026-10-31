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
| Avisos | Email (confirmação, lembrete 48h) + botão "Adicionar ao calendário" (.ics / Google) |
| Cancelamento | Cliente cancela até 24h antes. Depois disso, contacta o estúdio |
| Serviços | Um serviço por marcação, preço fixo. **Todas as marcações duram 1 hora** |
| Horário | Seg a sex 9:00–12:00 e 14:30–18:30; sáb 9:00–13:00; dom fechado (segunda aberta e domingo fechado por confirmar). Horas de início: 9:00, 10:00, 11:00, 14:30, 15:30, 16:30, 17:30 (sáb: 9:00, 10:00, 11:00, 12:00) |
| Limite sem conta | 1 marcação futura por telemóvel |
| Antecedência | Configurável: mínimo (ex: 2h) e máximo (ex: 6 semanas) |
| Stack | Next.js (App Router) + Supabase (Postgres, Auth, RLS) |
| Alojamento | **Vercel Hobby** (decisão de 30 out 2026, substitui Cloudflare Workers/OpenNext). Plano grátis é só para uso não comercial: se a Vercel bloquear o projeto, passa a Pro (20 $/mês) |
| Domínio/DNS | Registado e gerido no Cloudflare (DNS apontado para a Vercel) |
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
Next.js (Vercel, deploy por push no GitHub)
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
 └─ pg_cron → lembretes 48h

Resend (ou Brevo) → emails transacionais
Cloudflare Turnstile → anti-spam no formulário de convidada
```

Regras de alojamento (manter app portável e dentro dos limites):
- Lógica de dados, cron e ficheiros no Supabase, não em serviços do alojamento.
- Sem otimização `next/image` em runtime: imagens otimizadas antes do upload (ou loader próprio).
- Sem ISR. Páginas dinâmicas ou estáticas simples.
- Dependências leves: limite de bundle de 3 MiB comprimido no plano grátis.
- Funções na região `fra1` (Frankfurt), em `vercel.json`.
- Secrets nas variáveis de ambiente da Vercel (Settings > Environment Variables), nunca no repositório.

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
| 2–7 | Desenvolvimento, lançamento e piloto | App online | Detalhado na secção 10 (M0 a M8). **M0 feito** (30 out 2026), online em https://catt-nailstudio.vercel.app |

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
| Hosting | Vercel Hobby grátis (só uso não comercial). Se bloquearem → Vercel Pro 20 $/mês. Alternativa mais barata: Cloudflare Workers Paid 5 $/mês (ver nota do M0) |
| Email (Resend free) | 0€ até 3000/mês, 100/dia |
| Turnstile | 0€ |
| Domínio .pt | ~10-20€/ano |

Nota: alternativas prontas (Fresha, Booksy, Treatwell) existem; Fresha é grátis para marcações. Vantagem desta app: marca própria, sem comissões, controlo total.

## 9. Riscos / atenção

- **RGPD e segurança**: detalhado na secção 11. Dados de saúde ficam fora da app; o risco que sobra é a Catarina escrevê-los nas notas por hábito.
- **Concorrência**: dupla marcação resolvida na BD (exclusion constraint), não no frontend.
- **Termos da Vercel Hobby**: plano só para uso não comercial; pode ser suspenso. Risco aceite pelo Miguel a 30 out 2026; plano B = Vercel Pro ou Cloudflare Workers Paid.
- **Fuso/hora de verão**: testar dias de mudança de hora (março/outubro).
- **Email em spam**: configurar SPF/DKIM/DMARC no domínio.
- **Dependência de uma pessoa**: se a Catarina não atualizar folgas, clientes marcam em dias fechados → tornar bloquear dia muito rápido no painel.

## 10. Plano de desenvolvimento

Rascunho para discutir. As estimativas são em dias de trabalho focado e servem só para ordenar. Cada etapa (M0 a M8) termina com algo a funcionar e publicado no ambiente de testes.

### 10.1 Antes de começar

Contas e acessos (Miguel):
- Repositório GitHub privado.
- Supabase: **um único projeto**, só desta app, região UE (decisão de 30 out 2026: o Miguel só tem um projeto livre no plano grátis). Faz de staging e de produção. Supabase CLI local (Docker) para desenvolvimento e testes (pgTAP, Playwright, CI), que fazem de staging a sério. Regras para isto ser seguro:
  - Migrations só vão para o projeto na nuvem depois de passarem em local e no CI.
  - Até ao piloto (M8) o projeto só tem dados fictícios; antes de abrir, apagar os dados de teste e carregar os serviços reais (M7). Depois disso, nada de testes manuais com dados reais fora do necessário.
  - Os deploys de preview da Vercel não recebem as chaves do Supabase (só o ambiente Production), para uma branch de teste nunca escrever na BD.
  - Backups do Supabase só no plano pago (Pro, 25 $/mês): sem backups diários automáticos no grátis, exportar a BD (`supabase db dump`) antes de migrations importantes e antes do lançamento. Ponderar o Pro quando houver dados reais.
- Vercel: conta (Hobby) e projeto ligado ao GitHub. Cloudflare: DNS e Turnstile (site key de testes e de produção).
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
| CI | GitHub Actions: lint, typecheck, testes, build. Deploy pela integração Vercel/GitHub (`main` → produção; branches → previews) |
| Erros | Logs da Vercel + página de erro própria. Sentry só se for preciso |

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

**M0. Fundações** (1–2 dias) — **feito a 30 out 2026** (falta só o push para o GitHub)
- Criar o projeto Next.js com TypeScript, Tailwind v4, shadcn/ui, ESLint e Prettier.
- Aplicar os tokens do Design System (`globals.css`), fontes e logótipo. Página "em breve" com a marca.
- Alojamento na Vercel e primeiro deploy.
- CI no GitHub Actions.
- Segurança base: cabeçalhos HTTP (CSP, HSTS, etc.), Dependabot, secrets fora do repositório. Supabase criado numa região da UE.
- Feito quando: a página "em breve" está online e o CI passa. Tamanho do bundle e CPU por pedido medidos e anotados aqui.

Resultado do M0 (commit inicial local, sem remote):
- Next.js 16.4.3 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4, shadcn/ui (Button, estilo `base-nova` com base-ui, adaptado: pílula, alvos de 44 px), ESLint + Prettier, pnpm 10.
- Tokens do DS em `app/globals.css` (claro e escuro), fontes Cormorant Garamond (500/600) e Manrope (400–700) via `next/font/google`, `lang="pt-PT"`. Página "em breve" com `public/logo-cn-384.png` (recorte original redimensionado, não vetorizado).
- Primeiro construído para Cloudflare Workers (OpenNext) e deployado em `workers.dev`; a 30 out 2026 mudou-se para Vercel Hobby (OpenNext e Wrangler removidos do projeto, `vercel.json` com `fra1`). O Worker `catt-nailstudio` em `workers.dev` pode ser apagado no dashboard Cloudflare.
- Cabeçalhos em `next.config.ts` (CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors none), Dependabot, `.env.example`, CI (`.github/workflows/ci.yml`: install, lint, typecheck, build).
- **Medições** (Cloudflare, antes da mudança): first load JS da página inicial ≈ 176 KiB comprimido (570 KiB sem comprimir), mais 5 KiB de CSS. Worker OpenNext 984 KiB comprimido. CPU por pedido no Worker: P50 18,5 ms, P90 27,4 ms, P99 179 ms (arranque a frio), acima dos ~10 ms do plano grátis, amostra pequena. Foi o que levou a testar a Vercel. Na Vercel o bundle do cliente é o mesmo; medir o tempo de resposta depois do deploy.
- **Deploy feito** na Vercel Hobby a 30 out 2026: https://catt-nailstudio.vercel.app (build de 43 s, cabeçalhos de segurança confirmados).
- **Por fazer** (precisa do Miguel): criar o repositório GitHub, fazer push para o CI correr e ligá-lo no dashboard da Vercel (deploy automático); criar os projetos Supabase na UE. A CSP usa `'unsafe-inline'` nos scripts: rever com nonces ao juntar Turnstile e Supabase (M2).
- Nota de ferramentas: `pnpm` instalado globalmente (corepack estava avariado nesta máquina).

**M1. Base de dados e regras** (2–3 dias) — **feito a 30 out 2026, aplicado no projeto Supabase na nuvem**
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

Resultado do M1 (migrations em `supabase/migrations`, testes em `supabase/tests/database`, seed em `supabase/seed.sql`):
- Tabelas, enums, `btree_gist` e exclusion constraint (`appointments_no_overlap`), `admins`, `audit_log`. Esquema `public`, com funções internas em `private` (não expostas pela API).
- Funções: `available_slots(de, ate)` (pública), `book_appointment(servico, inicio, nome, telemovel, email, user_id)` e `cancel_appointment(id, token, user_id)` (**só `service_role`**: o servidor chama depois do Turnstile e do rate limit, senão qualquer pessoa com a chave pública saltava essas proteções). Devolvem `jsonb` `{ok, error|appointment_id, cancel_token}`. Erros: `invalid_phone`, `invalid_name`, `invalid_email`, `invalid_service`, `blocked`, `outside_window`, `slot_taken`, `guest_limit`, `phone_in_use`; no cancelamento `not_found`, `not_cancellable`, `too_late`.
- Token de cancelamento: gerado na BD (32 bytes), devolvido uma só vez, guardado como sha256. Só convidadas com email recebem token. Apagado ao cancelar e por job diário depois da marcação passar.
- Limite de convidada: 1 marcação futura por telemóvel, com `pg_advisory_xact_lock` por telemóvel contra pedidos em simultâneo. Conta: sem limite.
- RLS em todas as tabelas; `anon` só lê serviços ativos, definições e horário (privilégios revogados nas restantes). Clientes escrevem só pelas funções.
- Privacidade: `audit_log` por triggers (guarda colunas alteradas, nunca valores), `anonymize_client` (admin) e anonimização mensal de clientes inativas há 24 meses (`pg_cron`), contador de faltas automático.
- Testes pgTAP (70, todos a passar em local; job `database` no CI): dupla marcação, limite sem conta, bloqueio, janela, 24 h, folgas, mudança de hora (25 out 2026, 28 mar e 31 out 2027), RLS por papel (público, cliente A não vê cliente B, admin) e privacidade.
- Seed: horário real (segunda aberta e domingo fechado por confirmar) e 3 serviços **placeholder**. O seed não corre na nuvem com `db push`.
- Na nuvem (30 out 2026): 4 migrations aplicadas com `supabase db push --linked`, extensões `btree_gist`, `pgcrypto` e `pg_cron` ativas, os 2 jobs agendados, RLS ligado em todas as tabelas, lint limpo. Seed aplicado à mão na nuvem (30 out 2026): horário real e 3 serviços **placeholder** (apagar ou substituir pelos reais no M7, antes do piloto). Variáveis de ambiente de produção (Supabase e Turnstile) já na Vercel, só no ambiente Production.
- Por fazer: testar duas marcações em simultâneo a sério no Playwright (M2); criar o utilizador admin da Catarina e a linha em `admins`; MFA e configuração de Auth no M3/M4.

**M2. Página inicial e marcação sem conta** (3–4 dias) — **feito a 30 out 2026 (testado em local)**
- Ecrã de abertura (só no arranque a frio), página inicial, escolher serviço, escolher dia e hora, os seus dados, confirmação, como nos mockups.
- Componentes da marca: `Logo`, `ServiceCard`, `TimeSlot`, `CalendarDay`, `StatusBadge`.
- Turnstile e rate limit por IP e por telemóvel no formulário.
- Texto informativo de privacidade no ecrã de dados (sem "aceito"), rodapé com Privacidade, Termos e Livro de Reclamações.
- Estados de erro: hora acabou de ser ocupada, mês sem vagas, número bloqueado, limite sem conta.
- Playwright: marcar como convidada do início ao fim; duas marcações na mesma hora ao mesmo tempo, só uma ganha.
- Feito quando: uma pessoa consegue marcar no telemóvel, com a app na Vercel e a BD no projeto Supabase, e a marcação aparece na BD.

Resultado do M2:
- Páginas: `/` (hero, serviços, onde estamos com horário lido da BD, rodapé legal), `/marcar` (4 passos com o estado na URL: `?servico=…&dia=…&hora=…`; o botão voltar e os links partilháveis funcionam), `/marcar/confirmada?id=…`, `/privacidade` e `/termos` (**texto provisório**, a rever no M7). Ecrã de abertura só no arranque a frio (uma vez por sessão, sai assim que a página está pronta).
- Componentes da marca em `components/marca/`: `Logo`, `ServiceCard`, `TimeSlot`, `CalendarDay`, `StatusBadge`, mais `DiaHora`, `FormDados`, `Turnstile`, `Passo`, `Cabecalho`, `Rodape`, `Splash`.
- Servidor: Server Action `reservar` (zod, telemóvel normalizado para E.164, Turnstile, limite de pedidos por IP e por telemóvel, `book_appointment` com a chave secreta). O browser nunca fala com o Supabase. Erros: hora ocupada (volta ao passo 2 com aviso), número bloqueado, limite de convidada, telemóvel inválido, demasiados pedidos.
- Limite de pedidos: migration `20261030130001_rate_limit.sql` (`rate_limit_hit`, tabela em `private`, job horário). A chave guardada é um hash com sal (`RATE_LIMIT_SALT`): nem o IP nem o telemóvel ficam em claro. Se o limitador falhar, deixa passar (o Turnstile e a BD continuam a proteger).
- Testes Playwright (`pnpm test:e2e`, contra o Supabase local e chaves de teste do Turnstile): marcar do início ao fim, limite de convidada, telemóvel inválido e **duas marcações na mesma hora ao mesmo tempo (só uma ganha)**. Job `database` do CI corre pgTAP e Playwright.
- Desvios do plano: datas com `Intl` (hora de Lisboa) em vez de `@date-fns/tz`, para poupar bundle; o separador "Com conta" fica para o M3; o `.ics` e os emails para o M5.
- **Limitações até ao M5**: a convidada com email ainda não recebe email nem o link de cancelamento (o token é gerado mas não é entregue), por isso só cancela contactando o estúdio. O ecrã de confirmação não promete email.
- Bundle (gzip): JS próprio da rota `/` ≈ 22 KiB e `/marcar` ≈ 27 KiB, além do runtime partilhado (≈ 170 KiB). Valores medidos nos chunks do cliente do build.
- Migration do rate limit aplicada na nuvem a 30 out 2026 (3 jobs de cron ativos).
- **Por fazer**: preencher contactos e morada em `settings` (aparecem na página assim que existirem); texto "Sobre" e fotos quando a Catarina os enviar; ver CI e o deploy da Vercel depois do push.

**Alicerce de autenticação** (feito a 31 out 2026, antes de M3 e M4, que correm em paralelo)
- `lib/supabase/sessao.ts` (cliente com a sessão da pessoa, via cookies, respeita o RLS), `proxy.ts` (renova a sessão só em `/conta`, `/admin`, `/entrar`, `/auth`; as páginas públicas não passam por lá) e `lib/auth.ts`: `getUtilizador()`, `exigirUtilizador(destino)`, `eAdmin()`, `exigirAdmin(destino)` (quem não entrou vai para `/entrar?next=…`; quem entrou e não é admin vê 404). O M4 acrescenta o MFA em `exigirAdmin`.
- Entrada por link no email, sem palavra-passe: `/entrar` (Turnstile, limite por IP e por email, resposta igual haja conta ou não), `lib/email/entrada.ts` gera o link com `auth.admin.generateLink` e envia-o pelo Resend com o nosso desenho (decisão: não usar o email do Supabase nem SMTP, para não mexer na configuração de Auth do projeto), e `/auth/confirmar` troca o `token_hash` por sessão (funciona noutro browser, ao contrário do PKCE). Link de uso único e validade de 1 hora. O destino (`next`) só aceita caminhos internos (`lib/caminho.ts`, testado).
- `Sair` (Server Action) e dois esqueletos protegidos: `/conta` (do M3) e `/admin` (do M4).
- Testes: Vitest (caminho seguro) e Playwright em `e2e/conta.spec.ts` (8: redirecionamento, resposta igual, email inválido, entrar e sair, link de uso único, link inventado, destino seguro, 404 para quem não é admin).
- Nota: `generateLink` cria o utilizador se o email ainda não existir; Turnstile e limites travam o abuso. Rever no M3 uma limpeza de utilizadores nunca confirmados.

**M3. Conta da cliente** (2 dias) — **código feito a 31 out 2026, testado em local; falta aplicar a migration na nuvem**
- Entrar com link por email (Supabase Auth), em qualquer ponto do fluxo.
- "As minhas marcações": próximas, anteriores, cancelar até 24 h antes.
- Associar marcações antigas sem conta ao criar conta com o mesmo telemóvel.
- Página `/cancelar/[token]` para convidadas com email.
- "Os meus dados": editar, exportar e apagar conta.
- Mensagens que não revelam se um email tem conta.
- Feito quando: o fluxo com conta e o cancelamento funcionam no projeto na nuvem, com testes Playwright (em local).

Resultado do M3:
- **Entrar em qualquer ponto**: em `/marcar`, no passo dos dados, o separador "Com conta" (por omissão quando já há sessão) manda para `/entrar?next=…` e volta ao mesmo passo. `proxy.ts` passou a renovar a sessão também em `/marcar`. Marcar com conta não leva Turnstile (a identidade vem da sessão, que já o passou ao entrar); tem limite por conta. Sem limite de marcações futuras; não gera token (cancela-se em `/conta`).
- **`/conta`**: sem ficha pede nome e telemóvel (`claim_client`); com ficha mostra "Próximas" (cancelar até 24 h antes, `cancel_window_hours`), "Anteriores" (inclui canceladas e faltas) e "Nova marcação". Regras de apresentação em `lib/conta-regras.ts` (Vitest).
- **Associar marcações antigas**: pelo telemóvel, mas **só se o email da ficha antiga coincidir com o da conta, ou se a ficha não tiver email**. O telemóvel não é verificado, por isso sem esta regra quem escrevesse o número de outra pessoa herdava as marcações dela. Número de outra conta ou ficha com outro email dão a mesma mensagem. A mesma regra foi posta em `book_appointment` (`create or replace` na migration M3). Risco que fica: uma ficha antiga sem email pode ser reclamada por quem souber o telemóvel (só vê hora e serviço). Verificar o telemóvel por SMS fica fora do âmbito.
- **`/cancelar/[token]`**: o M5 já tinha tudo (página, ação com limite, regra das 24 h, link morre ao usar); só foi confirmado com teste.
- **Os meus dados** (`/conta/dados`): editar nome e telemóvel (o email é o da entrada; mudar exige o estúdio), exportar JSON (`/conta/dados/exportar`, lido com a sessão da pessoa, por isso o RLS garante que só vê o seu), apagar conta com confirmação (`delete_my_data`: cancela o futuro, anonimiza a ficha como no painel, e o servidor apaga o utilizador do Auth). A conta de admin não se apaga por aqui.
- **Mensagens neutras**: `/entrar` já respondia igual; as ligações de conta usam uma só mensagem para "número de outra conta" e "ficha com outro email".
- **Utilizadores nunca confirmados**: `generateLink` cria o utilizador mesmo que ninguém clique. Job diário `purge-unconfirmed-users` apaga os sem confirmação, sem login, com mais de 2 dias, sem ficha e que não sejam admin.
- Migration `20261031200001_m3_conta.sql`. Testes: pgTAP `07_m3_conta.test.sql` (17), Vitest (5 novos), Playwright `e2e/m3-conta.spec.ts` (9: ligar por telemóvel e email, não herdar com outro email, marcar com conta e cancelar, entrar a meio do fluxo, 24 h, editar e exportar, exportação exige sessão, apagar conta, cancelar por link). Suite completa: 26 Playwright verdes.
- **Por fazer**: aplicar a migration na nuvem (`supabase db push`, com o Miguel); os emails de confirmação de quem tem conta ainda dizem "contacte o estúdio" para cancelar, quando deviam apontar para `/conta` (texto em `lib/email/modelos.ts`, com teste); mudar de email na conta; no CI o pgTAP corre em BD limpa (em local o `03_rls` falha se sobrarem clientes de testes Playwright anteriores).

**M4. Painel da Catarina** (4–5 dias)
- Entrada e proteção do `/admin`, com MFA obrigatório e sessão que expira.
- Na ficha: exportar dados da cliente, apagar ou anonimizar. Aviso no campo de notas para não registar dados de saúde.
- Registo de alterações (`audit_log`) visível na marcação.
- Agenda do dia (lista de horas) e da semana, detalhe da marcação: mover, cancelar, marcar falta.
- Nova marcação manual, com opção de hora fora do horário.
- Horário semanal, bloqueios e férias.
- Serviços: lista, ordem (botões, não só arrastar), editar, foto, ativo/inativo.
- Clientes: pesquisa, filtros, ficha com notas, histórico e bloqueio.
- Notificações push (Web Push) para a Catarina quando há uma marcação nova ou cancelada, no lugar de emails: chaves VAPID, subscrição guardada por dispositivo (só admins), envio a partir de `book_appointment`/`cancel_appointment` via a app, opção nas definições (`settings.notify_on_booking`). No iPhone só funciona com a app instalada no ecrã inicial (iOS 16.4 ou mais), por isso depende do M6. Até lá, a Catarina vê as marcações no painel.
- Definições.
- Vista de computador da semana.
- Feito quando: a Catarina consegue gerir uma semana fictícia sozinha no telemóvel (teste com ela).

**M5. Emails e calendário** (2 dias) — **código feito a 30 out 2026, testado em local; falta o Resend real**
- Desenhar o template de email (confirmação, lembrete, cancelamento) com as skills de design.
- Envio por Resend a partir do servidor.
- `.ics` e link "Adicionar ao Google Calendar".
- Lembrete 48 h antes (era 24 h; mudado a 31 out 2026 porque as marcações são feitas com ~3 semanas de antecedência e às 24 h já não se pode cancelar): `pg_cron` + Edge Function do Supabase.
- Aviso à Catarina de novas marcações (se ativo nas definições).
- Feito quando: marcar, cancelar e o lembrete enviam os emails certos (com dados fictícios).

Resultado do M5 (código):
- Modelos em `lib/email/modelos.ts` (HTML de tabelas com os tokens do DS, texto simples e anexo `.ics`): confirmação (com "Adicionar ao Google Calendar" e link para cancelar), lembrete. **Sem email de cancelamento à cliente nem avisos por email à Catarina** (decisão de 31 out 2026: a página já confirma e os avisos à Catarina passam a ser notificações push; poupa envios). Teste visual feito; as fontes de email caem para Georgia e Arial/Manrope do sistema.
- Envio por Resend em `lib/email/enviar.ts` (chamada HTTP direta, sem SDK). Os emails saem depois da resposta (`after`), por isso uma falha de email nunca estraga a marcação. Sem `RESEND_API_KEY` não envia.
- Calendário: `.ics` em UTC (com testes) em `/marcar/confirmada/calendario?id=…` e link do Google; ecrã de confirmação com os dois.
- `/cancelar/[token]` (página, Server Action com limite por IP, e `/cancelar/ok`): cancela com `cancel_appointment`, regra das 24 h no servidor, link morre depois de usado. Não envia emails.
- Lembrete 48 h: em vez de Edge Function, o job `send-reminders` do `pg_cron` (de 30 em 30 min) chama `POST /api/lembretes` com `pg_net`; o endereço e o segredo estão no Vault (`site_url`, `cron_secret`). Assim os modelos ficam num só sítio (TypeScript). Só lembra quem marcou com mais de 49 h de antecedência, e reserva a marcação antes de enviar (nunca envia duas vezes). O lembrete diz até quando se pode cancelar (24 h antes) e remete para o link do email de confirmação; não leva link próprio porque o token só existe como hash. Melhoria futura: token derivado (HMAC) para o lembrete levar o link.
- Migration `20261031100001_emails.sql`: `settings.notify_on_booking`, `appointments.reminder_sent_at`, job.
- Testes: Vitest (`pnpm test`, 12 testes: `.ics`, DST, modelos, escape de HTML, regras do lembrete) e Playwright (9: cancelar por link, link inventado, `.ics`, lembretes só com segredo e só uma vez).
- **Por fazer (Miguel)**: conta no Resend e chave; no Vercel as variáveis `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL` e `CRON_SECRET`; aplicar a migration na nuvem e criar os dois segredos no Vault. Enquanto não houver domínio verificado, o Resend só envia para o email do dono da conta.

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
- **Subcontratantes**: Supabase (BD, autenticação, ficheiros), Vercel (alojamento), Cloudflare (DNS, Turnstile), Resend (emails). Aceitar o DPA (acordo de tratamento de dados) de cada um e guardar cópia.
- **Dados na UE**: projeto Supabase numa região europeia (ex.: Frankfurt). Resend com região UE. Vercel e Cloudflare servem globalmente (funções em `fra1`), mas não guardam dados de clientes (fica tudo no Supabase).
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
- Logs técnicos: os da Vercel e Supabase, com a retenção por omissão (dias). Nunca registar telemóvel, email ou notas nos logs da app.
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
