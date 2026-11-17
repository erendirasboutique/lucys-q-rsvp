-- Lucy's Quinceañera — personal guest pages
-- Run this ONCE in Supabase → SQL Editor. It is safe to run again (everything is "if not exists").
-- It never drops or deletes existing data.

-- 1) New columns on the existing rsvps table -------------------------------------------
alter table public.rsvps
  add column if not exists access_token text,
  add column if not exists access_token_created_at timestamptz default now(),
  add column if not exists last_opened_at timestamptz,
  add column if not exists preferred_language text,
  -- shown on the guest page, set by you in /admin
  add column if not exists table_note text,
  add column if not exists personal_note text,
  add column if not exists role_title text,
  add column if not exists role_moment text,
  add column if not exists role_details text,
  add column if not exists rehearsal_confirmed boolean default false,
  add column if not exists guest_tags text[] default '{}',
  -- filled in by the guest
  add column if not exists hotel text,
  add column if not exists arrive_date text,
  add column if not exists depart_date text,
  add column if not exists flight_number text,
  add column if not exists landing_date date,
  add column if not exists landing_time text,
  add column if not exists ride_share_ok boolean default false,
  add column if not exists shuttle_id uuid,
  add column if not exists checklist jsonb default '{}'::jsonb,
  add column if not exists meals jsonb default '[]'::jsonb,
  add column if not exists allergies text;

-- Every RSVP gets a long random private link code (new Typeform RSVPs too).
alter table public.rsvps
  alter column access_token set default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
update public.rsvps
  set access_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      access_token_created_at = now()
  where access_token is null;
create unique index if not exists rsvps_access_token_key on public.rsvps (access_token);

-- 2) New tables ---------------------------------------------------------------------------
create table if not exists public.portal_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.guest_messages (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid not null references public.rsvps(id) on delete cascade,
  sender text not null check (sender in ('guest', 'family')),
  category text,
  body text not null,
  created_at timestamptz default now(),
  read_by_family_at timestamptz,
  read_by_guest_at timestamptz
);
create index if not exists guest_messages_rsvp_idx on public.guest_messages (rsvp_id, created_at);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  audience text not null default 'all',   -- all | tag:<tag> | hotel:<name> | table:<number>
  created_at timestamptz default now()
);

create table if not exists public.portal_events (
  id uuid primary key default gen_random_uuid(),
  title_es text not null,
  title_en text,
  event_date date not null,
  event_time text,                         -- "18:00" (Guayabitos local time)
  duration_minutes int default 120,
  location text,
  maps_url text,
  audience text not null default 'all',    -- all | tag:<tag>
  ask_rsvp boolean default false,
  sort int default 0,
  created_at timestamptz default now()
);

create table if not exists public.portal_event_rsvps (
  event_id uuid references public.portal_events(id) on delete cascade,
  rsvp_id uuid references public.rsvps(id) on delete cascade,
  going boolean not null,
  updated_at timestamptz default now(),
  primary key (event_id, rsvp_id)
);

create table if not exists public.shuttles (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  depart_date date,
  depart_time text,
  from_place text,
  to_place text,
  seats int default 14,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.song_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  rsvp_id uuid references public.rsvps(id) on delete set null,
  hidden boolean default false,
  created_at timestamptz default now()
);
create table if not exists public.song_votes (
  song_id uuid references public.song_requests(id) on delete cascade,
  rsvp_id uuid references public.rsvps(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (song_id, rsvp_id)
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid references public.rsvps(id) on delete cascade,
  from_name text,
  body text,
  video_path text,
  created_at timestamptz default now()
);

create table if not exists public.guest_photos (
  id uuid primary key default gen_random_uuid(),
  rsvp_id uuid references public.rsvps(id) on delete set null,
  table_label text,
  path text not null unique,
  content_type text,
  hidden boolean default false,
  created_at timestamptz default now()
);
create index if not exists guest_photos_created_idx on public.guest_photos (created_at desc);

-- 3) Lock the new tables down. Only the server (service role key) can read or write them.
alter table public.portal_settings enable row level security;
alter table public.guest_messages enable row level security;
alter table public.announcements enable row level security;
alter table public.portal_events enable row level security;
alter table public.portal_event_rsvps enable row level security;
alter table public.shuttles enable row level security;
alter table public.song_requests enable row level security;
alter table public.song_votes enable row level security;
alter table public.wishes enable row level security;
alter table public.guest_photos enable row level security;

-- 4) Private storage bucket for wish videos and party photos (max 200 MB per file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('guest-uploads', 'guest-uploads', false, 209715200)
on conflict (id) do nothing;

-- 5) Starter settings (edit them later in /admin → Program → Event details).
insert into public.portal_settings (key, value) values
('event', '{
  "venue_name": "",
  "venue_address": "Rincón de Guayabitos, Nayarit, Mexico",
  "maps_url": "",
  "dress_code_es": "Formal",
  "dress_code_en": "Formal",
  "court_color": "",
  "rsvp_deadline": "",
  "meal_deadline": "",
  "meal_options": [],
  "gifts_url": "",
  "gifts_note_es": "",
  "gifts_note_en": "",
  "thank_you_es": "",
  "thank_you_en": ""
}'::jsonb),
('mode', '{"tonight_date": "2027-01-04", "after_date": "2027-01-06", "force": ""}'::jsonb),
('schedule', '[
  {"time": "16:30", "es": "Abren las puertas", "en": "Doors open"},
  {"time": "17:00", "es": "Gran entrada", "en": "Grand entrance"},
  {"time": "17:30", "es": "Cena", "en": "Dinner"},
  {"time": "18:30", "es": "Bailes tradicionales", "en": "Traditional dances"},
  {"time": "19:30", "es": "Pista de baile abierta", "en": "Open dance floor"},
  {"time": "21:30", "es": "Partida del pastel", "en": "Cake cutting"},
  {"time": "23:00", "es": "Despedida", "en": "Farewell"}
]'::jsonb)
on conflict (key) do nothing;
