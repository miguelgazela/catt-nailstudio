-- M1: esquema base. Fuso fixo Europe/Lisbon, marcações de 1 h, sem sobreposições.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Funções internas (não expostas pela API).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.appointment_status as enum ('confirmed', 'cancelled', 'no_show', 'done');
create type public.appointment_origin as enum ('online', 'admin');

-- Linha única de definições.
create table public.settings (
  id boolean primary key default true check (id),
  min_notice_minutes integer not null default 120 check (min_notice_minutes >= 0),
  max_advance_days integer not null default 42 check (max_advance_days > 0),
  cancel_window_hours integer not null default 24 check (cancel_window_hours >= 0),
  contact_phone text,
  contact_email text,
  address text,
  instagram text,
  policy_text text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  photo_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Períodos de abertura. weekday ISO: 1 = segunda ... 7 = domingo. Vários por dia (pausa de almoço).
create table public.weekly_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  unique (weekday, start_time)
);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (ends_at > starts_at)
);

-- phone em E.164. Sem dados de saúde nas notas (só preferências).
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 100),
  phone text unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (char_length(email) <= 254),
  notes text check (char_length(notes) <= 1000),
  blocked boolean not null default false,
  no_show_count integer not null default 0 check (no_show_count >= 0),
  anonymized_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'confirmed',
  origin public.appointment_origin not null default 'online',
  -- só o hash do token de cancelamento (sha256 hex); o token vai por email
  cancel_token_hash text,
  price_cents integer not null check (price_cents >= 0),
  note text check (char_length(note) <= 500),
  cancelled_by text check (cancelled_by in ('client', 'admin', 'system')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at = starts_at + interval '1 hour'),
  -- duas marcações confirmadas nunca se sobrepõem
  constraint appointments_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed')
);
create index appointments_client_idx on public.appointments (client_id);
create index appointments_starts_idx on public.appointments (starts_at);
create unique index appointments_token_idx on public.appointments (cancel_token_hash)
  where cancel_token_hash is not null;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Registo de alterações. Guarda ids e nomes de colunas, nunca valores pessoais.
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
