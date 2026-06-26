# Lucy's Quinceañera RSVP Portal

## Supabase SQL
Run this in Supabase SQL Editor:

```sql
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
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table rsvps enable row level security;

create index if not exists rsvps_lookup_idx on rsvps (phone_normalized, full_name);
```

## Vercel Environment Variables
Add these in Vercel > Project > Settings > Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (your Supabase publishable key)
- `SUPABASE_SECRET_KEY` (your Supabase secret key)

Redeploy after adding them.

## Typeform Webhook URL
Use this in Typeform > Connect > Webhooks:

`https://YOUR-VERCEL-SITE.vercel.app/api/typeform`

Turn it ON and submit a test RSVP.

## Custom Font
Upload your font to:

`public/fonts/lttrecoleta.otf`

The site already uses this font path.
