# HANDOFF: Catarina Neves Nails Studio (booking app)

Written 6 Nov 2026 for a Claude account with zero prior context. Complements, does not replace: `PLANO.md` (source of truth, ~550 lines, Portuguese, per-milestone "Resultado" sections), `AGENTS.md`, `README.md`, `docs/rgpd/`. Read PLANO.md sections 1, 10.3 and 11 after this file. No secrets are in this doc; all keys live in Vercel env vars / `.env.local` (gitignored) / Supabase Vault.

Language: user (Miguel) speaks Portuguese (PT-PT). Product UI copy, commit messages, PLANO.md are in PT-PT. Reply to Miguel in PT unless he writes English. His global CLAUDE.md asks for terse "caveman" style replies.

## 1. Product and client

- Booking web app / PWA for a one-person manicure studio, "Catarina Neves Nails Studio" (Gondomar, Porto area). Built by Miguel (a cousin of Catarina) as a favour. Client is Catarina; end users are mostly women arriving via Instagram.
- Live: https://catt-nailstudio.vercel.app (Vercel Hobby, region fra1). Repo: `git@github-personal:miguelgazela/catt-nailstudio` (private, `main` only; deploy on push to `main`).
- No online payments (pay at studio). One agenda (Catarina). One service per booking, **every booking lasts 1 hour**, fixed price per service. Confirmation is automatic.
- Hours: Mon-Fri 9-13 (changed from 9-12 on 6 Nov; start times 9,10,11,12), 14:30-18:30 (starts 14:30,15:30,16:30,17:30), Sat 9-13, Sun closed. Monday open / Sunday closed are assumptions never confirmed with Catarina. Timezone fixed `Europe/Lisbon`, stored `timestamptz`.
- Client flows: guest (name + phone, optional email; max 1 future booking per phone; Turnstile + rate limits) or account (passwordless email link/code). Cancel up to 24 h before. Reminder email 48 h before. Add-to-calendar (.ics + Google link).
- Admin (Catarina + Miguel): agenda day/week, manual booking, move/cancel/no-show, weekly hours + time off, services (photo, order, hide), clients (notes, block, export, anonymize), settings, stats, Web Push notifications. Mandatory TOTP MFA.

## 2. Stack, run, test, deploy

- Next.js 16.4.3 (App Router, Turbopack; **AGENTS.md warns this Next has breaking changes: read `node_modules/next/dist/docs/` before coding**; note `proxy.ts` replaces middleware), React 19, TypeScript strict, Tailwind v4, shadcn/ui (`base-nova`, base-ui, pill buttons, 44px targets), pnpm 10 (installed globally; corepack broken on Miguel's Mac), Supabase (Postgres, RLS, Auth, Storage, pg_cron, pg_net, Vault), Resend (HTTP, no SDK), Cloudflare Turnstile, `web-push`, Vercel Web Analytics, zod, Vitest, pgTAP, Playwright (+ axe-core).
- Dev: `pnpm install && pnpm dev`. Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. E2E: `pnpm test:e2e` (script `scripts/e2e.mjs`; `E2E_PORT` for a second port; needs local Supabase + Docker).
- Local DB (Docker, ports 544xx): `pnpm dlx supabase start -x studio,imgproxy,vector,logflare,edge-runtime,realtime,storage-api,supavisor,mailpit,postgres-meta`; `supabase db reset`; `supabase test db` (pgTAP, ~101 tests in `supabase/tests/database`). Worktrees share one local Supabase; e2e tests delete users, so do not run two suites at once. pgTAP `03_rls` fails locally if leftover e2e clients exist: `db reset` first.
- Cloud DB: **one Supabase project only** (EU), serves as staging and prod. Migrations go via `supabase db push --linked` only after local + CI pass. Seed is NOT applied by push (was applied by hand once). No daily backups on free plan: `supabase db dump` before risky migrations.
- Env vars (names only; see `.env.example`): Supabase URL/anon/service role, Turnstile site/secret, `RATE_LIMIT_SALT`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SITE_URL`, `CRON_SECRET`, VAPID public/private/subject, `PAINEL_SESSAO_SECRET`. Vercel preview deploys deliberately get no Supabase keys. Supabase Vault holds `site_url` and `cron_secret` (used by pg_cron/pg_net to call `/api/lembretes` and `/api/push`).
- CI: `.github/workflows/ci.yml` (lint, typecheck, build, plus `database` job running pgTAP + Playwright). Dependabot on.
- Deploy flow Miguel uses: ask Claude to commit; Claude asks before push; push to `main`; Vercel auto-deploys 1-2 min. Env var changes need a manual Redeploy. Migrations must reach the cloud BEFORE the code that needs them is pushed.

## 3. Milestones

Order: M0 > M1 > M2 > (alicerce auth) > M3 // M4 > M5 > M6 > M7 > M8. M5 was actually done before M3/M4.

- **M0 Foundations (30 Oct).** Next scaffold, tokens, fonts, "em breve" page, security headers (CSP with `unsafe-inline` scripts, HSTS...), CI. Originally built for Cloudflare Workers/OpenNext; measured CPU P50 18.5 ms / P99 179 ms (over free ~10 ms), then moved to Vercel Hobby the same day; OpenNext/Wrangler removed. Stale Worker `catt-nailstudio` on workers.dev can be deleted in Cloudflare.
- **M1 DB (30 Oct).** Schema, `btree_gist` exclusion constraint against overlap, `available_slots`, `book_appointment`, `cancel_appointment` (service_role only, called by server after Turnstile + rate limit), RLS everywhere, `audit_log` (columns only, never values), anonymization (admin + monthly cron after 24 months), hashed cancel tokens, pgTAP.
- **M2 Home + guest booking (30 Oct).** `/`, `/marcar` (4 steps, state in URL), `/marcar/confirmada`, `/privacidade`, `/termos`, splash only on cold start, hashed-salt rate limit (`private.rate_limit_hit`). Dates via `Intl`, not `@date-fns/tz`.
- **Auth foundation (31 Oct).** Passwordless email via our own Resend template using `auth.admin.generateLink` + `/auth/confirmar` (token_hash, works cross-browser), not Supabase mail/SMTP.
- **M5 Emails/calendar (done before M3/M4).** Confirmation + reminder (48 h, was 24 h) templates in `lib/email/modelos.ts`, `.ics`, `/cancelar/[token]`, `send-reminders` pg_cron job every 30 min calling the app. Decision: NO cancellation emails to clients and NO email alerts to Catarina (push replaces them).
- **M3 Client account + M4 Admin panel (31 Oct), parallel run.** See section 4.
- **M6 PWA (31 Oct).** manifest, icons via `pnpm icones` (sharp), iOS splash for 7 iPhones, offline page, SW caches only `/offline.html`, `/abrir` start route (admin goes to `/admin`, others `/`), axe 0 violations, Lighthouse 100s. Dark mode NOT done (no transparent logo; dark tokens exist in CSS).
- **M7 Launch (1 Nov, technical part done).** Legal texts from `lib/legal.ts` (responsible: Catarina Neves, Largo de Santo Antonio, Sao Cosme, Gondomar; RAL entity CICAP; min age 16 with adult authorisation; no NIF by decision; no-show has no penalty but is recorded), Livro de Reclamacoes link in footer, `docs/rgpd/` (processing register, incident plan), security review (no high findings), DB-level aal2 for admin, per-email booking limit (3/h), fail-closed limiter for MFA/login codes.
- **Extras after M6 (1 Nov):** login link in header + 6/8-digit email code for installed iPhone app; panel tab pill + instant tab switch; push "A ativar..." feedback; copy "Entrar ou criar conta"; Vercel Web Analytics + `/admin/estatisticas`; `EMAIL_REPLY_TO`; hero + fallback service photos; instant navigation (loading skeletons, top progress bar, pending buttons); Mon-Fri morning to 13:00.
- **M8 Pilot: NOT started.** 2 weeks, 5-10 trusted clients (cousins already registered), then Instagram link.

## 4. The parallel M3/M4 run (Sonnet 5.5)

- Orchestrator session "M3 e M4 paralelos com Sonnet 5.5" launched two Sonnet 5.5 sessions, each in its own git worktree/branch (`claude/m3-conta-cliente-f78cae`, `claude/m4-painel-admin-db8f87`). Rules given: separate folders (M3: `app/conta`, `app/marcar`; M4: `app/admin`), migration prefixes `m3_`/`m4_`, each edits only its section of PLANO.md, no push, no cloud migrations, no prod keys without asking, one commit per block.
- Prereq blocker: Claude Desktop refused to create worktrees in this repo until the folder was opened once in Desktop ("no record of a session opened in this repository"). Fix was user opening the folder in Desktop, then retry.
- M4 finished first (8 commits). M3 stopped unexpectedly mid-work with uncommitted files; orchestrator resumed it via SendMessage. Same file collisions predicted: `proxy.ts`, `database.types.ts`, `e2e/conta|marcar`, pgTAP file number `06_` (M3 renamed to `07_`).
- Orchestrator (not the workers) reviewed and merged M4 then M3 into `main`: conflicts only in `PLANO.md` and `proxy.ts` (kept M4 panel session + M3 `/marcar` refresh). `pnpm install` was needed (`web-push`). ESLint was scanning `.claude/worktrees`; fixed by ignoring `.claude/`. After merge: lint, typecheck, 28 Vitest, 99 pgTAP, 50 Playwright green. Worktrees and branches were deleted later (local and the remote `claude/m6-pwa-*`).
- M6 was run the same way (own session, Sonnet 5.5, worktree `claude/m6-pwa-870064`), which pushed directly to main as fast-forward.

## 5. Visual identity and mockups

- Direction chosen: **A "Nude & Ameixa"** (editorial, warm, premium-accessible) out of 3-4 explored. Logo: original Higgsfield image (plum squoval nail with italic "CN"), files `brand/logo-cn.png` (1024) and `brand/logo-cn-crop.png` (680, used in app). Needs a transparent-background version for dark mode (open).
- Fonts: Cormorant Garamond 600 (headings >=20px) + Manrope 400-700 (body 16px). Primary `#7A3B52`, background `#F7F1EC`, foreground `#2E1F26`, card `#FFFFFF`. Full token table in PLANO.md 6.1. Radii 10/12/16/24/pill; 4pt spacing; 20px side margin; AA contrast; 44px touch targets.
- Claude Design artifacts (private, claude.ai): Design System `H5nbhM6N2pAQUMZnyjZ8xg`; exploration canvas `L5rLWGMHQs7R14qnneRuwU`; client screens `PxcWT1VmYHm159P4CdyrQ8`; admin panel `6eQeeFeAutpNiU2kCoENb5` (base `claude.ai/artifact/<id>`). Admin day view is an hour list with written status; week has desktop legend. Splash = big logo with 40px rounded corners + soft shadow, name 48px, "NAILS STUDIO" 15px, three dots. Header was changed to show the full name "Catarina Neves Nails Studio" after a client comment.
- Mockup images session: photos from the client-screens artifact were saved to `public/fotos/` (`hero.jpg`, `manicure-gel.jpg`, `manutencao-gel.jpg`, `remocao-gel.jpg`), hero used on home, service-card falls back to a photo by service name ("remo...", "manuten...", "gel"); uploaded admin photo always wins. They are illustrative placeholders (240px source).
- Higgsfield attempt: 7 AI hand images generated (gpt_image_2_5, quality low, ~1.75 credits). **Rejected by Miguel: extra fingers, weird hands.** Not used. Decision: Catarina supplies real photos (upload in admin Services; replace `public/fotos/hero.jpg` for home hero). Options if retried: quality high, or non-hand product shots.

## 6. Decisions and why

- Hosting: first Cloudflare (Vercel Hobby forbids commercial use, advertising a service counts; removing prices would not help), then back to **Vercel Hobby** on 30 Oct because Workers free CPU limit was exceeded and Miguel accepted the ToS risk. Plan B: Vercel Pro ($20/mo) or Cloudflare Workers Paid ($5). Kept portable: logic/cron/files in Supabase, no ISR, no next/image runtime, domain DNS at Cloudflare.
- One Supabase project (free-tier slot limit). Safety by local-first migrations and CI.
- `book_appointment`/`cancel_appointment` only callable by service_role: otherwise anon key bypasses Turnstile/rate limit.
- Claiming old guest bookings by phone requires matching email (or none on old record), since phone is unverified. Residual risk accepted.
- Admin is never a client: `/conta` redirects to `/admin`; no "Com conta" on `/marcar` for admins.
- Admin login links only sent to admins (`is_admin_email`); non-admins get identical neutral message.
- Panel session: 3 days idle / 7 days max (was 4h/12h, too annoying); on expiry ask only TOTP code, not email. Signed HMAC cookie `painel`; set `PAINEL_SESSAO_SECRET` (falls back to service key, was set by Miguel).
- `is_admin()` requires `aal2` in DB (stolen magic link could otherwise hit PostgREST).
- Cancelling in panel does not notify client; reminders 48 h because bookings are made ~3 weeks ahead.
- Push sent from Next route `/api/push` triggered by DB trigger via pg_net (not a Supabase Edge Function; same pattern as reminders). VAPID keys unique to this app.
- No health data / allergies stored (RGPD). Notes field is client-visible via data export (right of access); warn Catarina.
- No cookie banner (essential cookies only; Vercel Analytics is cookieless; analytics strips query strings and `/cancelar/[token]`, ignores admin routes). Google Analytics rejected.
- Site stays on vercel.app (no custom domain). Emails send from verified Resend subdomain `catt-nailstudio.miguelgazela.com` (`EMAIL_FROM` = "Catarina Neves Nails Studio <marcacoes@...>"), replies go to Catarina.
- No NIF in legal texts (Miguel's call; DL 7/2004 art. 10 arguably wants it; low risk).
- iOS status bar `default` not `black-translucent`; `viewportFit: cover`.

## 7. Bugs found and fixes (useful patterns)

- Push subscription never saved (admin had no UPDATE permission on table): server now writes with service key after admin check; settings page re-syncs on open.
- iPhone tab bar clipped: missing `viewport-fit=cover` in viewport.
- Installed iPhone app had no login path (no URL bar) and email link opens in Chrome/Safari with a separate session: added header "Entrar" + email OTP code typed inside the app.
- Slow navigation (~1 s): server was fast (~12 ms); lack of `loading.tsx` meant Next waited. Fixed with skeletons, optimistic tab highlight, top progress bar after 120 ms, pending buttons; auth/admin checks deduped per request. React keeps skeleton >=300 ms by design.
- Push enable felt broken: Apple registration takes seconds; added "A ativar..." state and re-check on visibility.
- Tests failing only on Sundays ("next Monday" < 24 h away) fixed.
- Splash removed DOM node on leaving home (error) fixed in `fb2e82b`.
- Analytics script 404 until a redeploy after enabling Analytics in Vercel.
- Never-confirmed users: `generateLink` creates users; daily job `purge-unconfirmed-users`.
- Rejected: Cloudflare-first hosting (above), Supabase mail/SMTP, PKCE magic link, drag-only service ordering (buttons used), deleting services (hide only), reusing KangarooSplit's VAPID keys / Edge Function push, PKCE, AI hand photos.

## 8. Current state (6 Nov 2026)

- `main` == `origin/main` at `2785254` ("Horario: manha de segunda a sexta passa a ir ate as 13:00"). Working tree clean, nothing uncommitted, no stash, no local worktrees.
- Remote branches besides main: 3 Dependabot branches (bump actions/checkout 4>7, setup-node 4>7, pnpm/action-setup 4>6). Not reviewed or merged; check CI compatibility before merging.
- **The 13:00 hours change only touched `supabase/seed.sql` and a comment in `lib/dados.ts`. Production `weekly_hours` still has 12:00 unless Catarina changed it in admin Horario or this was run:** `update public.weekly_hours set end_time='13:00' where weekday between 1 and 5 and end_time='12:00';` (verify in prod first).
- Production data: 3 placeholder services (no photos, to hide/replace), real client accounts (cousins), Catarina's settings only have contact email. Matilde's test booking deleted. Test guest "Miguel" deleted.

## 9. Open TODOs

1. Catarina: first admin login on her phone, TOTP setup, enable push, install PWA; then the M4 "done" test (manage a fictional week alone).
2. Catarina fills in admin: real services (name, price, description, photo), hide the 3 placeholders; Settings (phone, address, Instagram, policy text). Real photos for hero/services.
3. Import her existing future bookings (via "Nova marcacao" or from a list).
4. Confirm Mon open / Sun closed; confirm min/max advance (defaults 2 h / 6 weeks).
5. Apply the weekday-13:00 SQL in prod (see section 8).
6. Miguel: Android install test; airplane mode test; DPAs (Supabase, Vercel, Resend, Cloudflare), keep PDFs in `docs/rgpd/`; check CICAP covers Gondomar at cicap.pt; legal review of privacy/terms; tell Catarina not to put in notes anything clients cannot read.
7. M8 pilot (2 weeks), then Instagram link.
8. Code/known gaps: push endpoint host allow-list (admin only, skipped); reminder emails lack own cancel link (token only stored as hash; idea: HMAC-derived token); iPad/landscape iOS splash; splash image lacks written name; dark mode needs transparent logo; CSP `unsafe-inline` to revisit with nonces; real push delivery tested on iPhone manually (works), cron `send-reminders` with panel untested; mockups not re-synced for every late change; stale Cloudflare worker; weekday-hours test fixtures still use old hours; consider Supabase Pro for backups once real data exists, and Vercel Pro if flagged as commercial.
9. Possible backlog (PLANO section 5): deposit/payment, SMS/WhatsApp, waitlist, extras, gallery, reviews.

## 10. User preferences (Miguel)

- Spawn new sessions/phases with **Sonnet 5.5**; he reviews, then says "faz push". Always ask before push, cloud migration, or deleting prod data (show what will be deleted first, delete only after "sim").
- One feature per commit; keep PLANO.md updated with a "Resultado" per change; do not add unrelated files to commits (earlier sessions left others' changes out).
- Wants verification before "done": run lint, typecheck, Vitest, pgTAP, Playwright; say honestly what was not tested (e.g. real iPhone).
- Does not paste keys in chat; copy from terminal to Vercel himself. Explain env var steps concretely (Production only, Redeploy after).
- Reference app he knows: KangarooSplit (his other app; faster nav, bigger tab bar, same Web Push pattern). Compare against it when UX feels slow.
- Cares about: instant-feeling taps on mobile, admin ergonomics on phone, simple copy in PT-PT, privacy (RGPD), not over-engineering.
- iOS simulator rules in his global CLAUDE.md do not apply here (web project).
- Past session list: 0b6d9bac (planning), c3fb9350 (brand/design system), 8e0cf8fe (M0, M1, M2, auth, M5, legal), f4572802/8a14c315 (M3/M4 workers), 50f89dcd (M6), 703ab8fe (orchestrator, extras, M7), 5c28c936 (mockup images, hours change).
