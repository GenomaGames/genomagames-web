-- People who sign up through the Genoma Games website.
-- Holds the person, their gaming profile and their email consents.

create table public.contacts (
  -- Identity
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  country text,
  preferred_language text,
  year_of_birth smallint,

  -- Gaming profile
  gaming_frequency text,
  gaming_session_length_hours numeric(4, 1),
  used_platforms text[],
  preferred_platform text,
  has_participated_in_playtests boolean,
  has_given_playtest_feedback boolean,
  preferred_genres text[],
  avoided_genres text[],
  last_game_played text,

  -- Email consents
  wants_email_updates boolean not null default false,
  wants_email_feedback_requests boolean not null default false,

  -- State
  email_verified boolean not null default false,
  has_wishlisted_helix boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Postgres has no ON UPDATE clause, so updated_at is kept in sync by a trigger.
-- Shared by any table that needs it.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row
  execute function public.set_updated_at();


-- Contacts hold personal data: no one reaches them through the public API.
-- Enabling RLS without any policy denies every request from the anon and
-- authenticated roles. The website server is the only writer, and it uses the
-- service role key, which bypasses RLS.
alter table public.contacts enable row level security;
