-- Filipino Fill: initial schema
-- Profiles (mirrors auth.users), establishments + photos, and comments.
-- Clients only ever READ through RLS; all writes go through the NestJS API,
-- which connects with a privileged role and enforces authorization itself.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text not null unique check (char_length(email) between 3 and 320),
  display_name      text check (char_length(display_name) between 1 and 60),
  role              text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  email_verified_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column public.profiles.email_verified_at is
  'Set once the user completes email OTP verification. A user is "registered" only when this is non-null.';

-- Hard guarantee that there is at most one super admin, even under concurrent setup requests.
create unique index profiles_single_super_admin on public.profiles (role) where role = 'super_admin';
create index profiles_verified_idx on public.profiles (email_verified_at) where email_verified_at is not null;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Keep profiles in sync with Supabase Auth (signup + email confirmation).
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, email_verified_at)
  values (new.id, lower(new.email), new.email_confirmed_at)
  on conflict (id) do update
    set email = excluded.email,
        email_verified_at = coalesce(public.profiles.email_verified_at, excluded.email_verified_at);
  return new;
end;
$$;

create trigger on_auth_user_upserted
  after insert or update of email, email_confirmed_at on auth.users
  for each row
  when (new.email is not null)
  execute function public.sync_profile_from_auth();

-- ---------------------------------------------------------------------------
-- Establishments
-- ---------------------------------------------------------------------------

create table public.establishments (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name              text not null check (char_length(name) between 2 and 120),
  category          text not null check (category in (
                      'restaurant', 'bakery', 'grocery', 'cafe', 'remittance', 'beauty',
                      'church', 'community', 'services', 'health', 'retail')),
  tagline           text check (char_length(tagline) <= 160),
  description       text not null check (char_length(description) between 10 and 4000),
  address           text not null check (char_length(address) between 3 and 200),
  neighbourhood     text not null check (char_length(neighbourhood) between 2 and 80),
  city              text not null default 'Calgary',
  postal_code       text check (postal_code ~ '^[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]$'),
  latitude          double precision not null check (latitude between 50.80 and 51.25),
  longitude         double precision not null check (longitude between -114.35 and -113.85),
  phone             text check (char_length(phone) <= 32),
  email             text check (char_length(email) <= 320),
  website           text check (char_length(website) <= 300),
  hours             jsonb not null default '{}'::jsonb,
  price_level       smallint check (price_level between 1 and 4),
  rating            numeric(2, 1) check (rating between 0 and 5),
  review_count      integer not null default 0 check (review_count >= 0),
  tags              text[] not null default '{}',
  is_filipino_owned boolean not null default true,
  established_year  smallint check (established_year between 1950 and 2100),
  search_vector     tsvector,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create trigger establishments_set_updated_at
  before update on public.establishments
  for each row execute function public.set_updated_at();

-- tsvector is maintained by trigger (array_to_string isn't IMMUTABLE, so a generated column won't do).
-- 'simple' config: names are largely Tagalog/Bisaya, so English stemming would do more harm than good.
create or replace function public.establishments_refresh_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
      setweight(to_tsvector('simple', coalesce(new.name, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(new.category, '') || ' ' || array_to_string(new.tags, ' ')), 'B')
    || setweight(to_tsvector('simple', coalesce(new.neighbourhood, '') || ' ' || coalesce(new.tagline, '')), 'C')
    || setweight(to_tsvector('simple', coalesce(new.description, '')), 'D');
  return new;
end;
$$;

create trigger establishments_search_vector
  before insert or update of name, category, tags, neighbourhood, tagline, description
  on public.establishments
  for each row execute function public.establishments_refresh_search_vector();

create index establishments_search_idx on public.establishments using gin (search_vector);
create index establishments_name_trgm_idx on public.establishments using gin (name extensions.gin_trgm_ops);
create index establishments_active_category_idx on public.establishments (category) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------

create table public.establishment_photos (
  id               uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  url              text not null check (char_length(url) between 1 and 1000),
  caption          text check (char_length(caption) <= 200),
  sort_order       smallint not null default 0,
  created_at       timestamptz not null default now()
);

create index establishment_photos_order_idx on public.establishment_photos (establishment_id, sort_order);

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

create table public.comments (
  id               uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  body             text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index comments_establishment_idx on public.comments (establishment_id, created_at desc) where deleted_at is null;
create index comments_user_idx on public.comments (user_id);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: public read of live data, no direct client writes.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.establishments enable row level security;
alter table public.establishment_photos enable row level security;
alter table public.comments enable row level security;

create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Anyone reads live establishments"
  on public.establishments for select to anon, authenticated
  using (deleted_at is null);

create policy "Anyone reads photos of live establishments"
  on public.establishment_photos for select to anon, authenticated
  using (exists (
    select 1 from public.establishments e
    where e.id = establishment_id and e.deleted_at is null));

create policy "Anyone reads live comments"
  on public.comments for select to anon, authenticated
  using (deleted_at is null);
