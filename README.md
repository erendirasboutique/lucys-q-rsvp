# Lucy's Quinceañera RSVP Portal

## Upload to GitHub
Make sure these files are at the top level of the repo:

- app
- public
- package.json
- next.config.js

## Add your custom font
Upload your font file to:

public/fonts/lttrecoleta.otf

## Vercel Environment Variables
Add these in Vercel > Project > Settings > Environment Variables:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SECRET_KEY=your_sb_secret_key

Do not put these in GitHub.

## Supabase SQL
Run this in Supabase SQL Editor:

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  travel_from text,
  attending text,
  guest_count integer,
  additional_guests text,
  confirmed_guests text,
  phone text,
  phone_normalized text,
  comments text,
  typeform_response_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table rsvps enable row level security;

create index if not exists rsvps_phone_name_idx on rsvps (phone_normalized, full_name);

## Typeform Webhook URL
After Vercel deployment, add this in Typeform > Connect > Webhooks:

https://YOUR-VERCEL-DOMAIN.vercel.app/api/typeform

## Test URLs
Open these after deployment:

https://YOUR-VERCEL-DOMAIN.vercel.app
https://YOUR-VERCEL-DOMAIN.vercel.app/api/typeform
https://YOUR-VERCEL-DOMAIN.vercel.app/api/test-db

/api/typeform should show a JSON message saying the route is live.
/api/test-db should say Supabase connection works.
