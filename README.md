# Lucy’s Quinceañera — clean RSVP repository

**Exactly two user-facing routes:** `/` (guest RSVP lookup/edit) and `/admin` (live admin dashboard). Other routes under `/api/` are backend endpoints, not public pages. No Twilio, demo guests, event content pages, or mock seating system.

## Deploy without breaking existing data
1. Back up your current GitHub repo and export a Supabase backup. **Replace repository contents**, not merely merge: merging leaves unwanted routes behind. Do not delete the Supabase project or `rsvps` table.
2. Upload all contents of this ZIP **at repository root** (so `app/page.js`, `app/admin/page.js`, and `package.json` are at root). Remove old app pages and old SMS routes. Keep the domain attached to the same Vercel project.
3. In Vercel project Settings → Environment Variables, set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or existing `SUPABASE_SECRET_KEY`), `ADMIN_PASSWORD`, `RSVP_TOKEN_SECRET` (random 32+ characters), `TYPEFORM_WEBHOOK_SECRET` (if using Typeform webhook). Never add secret keys to GitHub or use NEXT_PUBLIC for them.
4. In GitHub, commit the changed package.json and regenerate `package-lock.json` with `npm install` if a lockfile is present. Deploy on Vercel.
5. Verify `/`, `/admin`, guest lookup, guest update, admin edit, admin delete, and Typeform test submission before relying on it. Test with a non-production RSVP first.
6. To restore the RSVP page video, upload your original video file as `public/lucy-video.mp4`. The player hides if the file is absent. The ZIP includes only the logo image, not any font files. Add your own licensed font assets privately if needed.

## Typeform
The existing Typeform webhook URL should be `https://rsvp.lucysquinceanera.com/api/typeform`. This code requires a webhook secret; configure the same secret in Typeform webhook settings and Vercel. It reuses the legacy field-mapping logic from the older portal; **test a real Typeform submission** because the mapping may need adjustment to your current form. The existing database table is preserved.

## Security and limitations
Guest editing requires a 30-minute signed token returned by an exact-name and phone-suffix lookup or by a check-in code. Seven-digit phone lookup and check-in codes are less secure than verified one-time passcodes; use OTP for sensitive data. There is no persistent rate limiting on guest search or admin password attempts; add edge/WAF rate limiting before public launch. Admin password is verified on every backend request, not just in the browser. Admin dashboard loads up to 2000 RSVPs. No SMS features are installed.

## Database
Uses existing `public.rsvps` fields: `id`, `full_name`, `phone`, `phone_normalized`, `attending`, `guest_count`, `travel_from`, `additional_guests`, `confirmed_guests`, `comments`, `updated_at`, `table_number`, `checkin_code`, `checked_in`, `checked_in_at`, and Typeform metadata fields if present. No new SQL needed if these already exist. Do not run DROP TABLE.


## Integrated admin tabs (this build)
The only public pages are `/` and `/admin`. The admin has Guests & Check-In, Seating, and SMS Messages tabs. Seating is based on real Supabase RSVPs and each table assignment is persisted using `/api/admin-update-rsvp`; no demo guests. The seating tab has 12 initial drop zones plus any tables present in Supabase and a custom table field. Drag a confirmed party or use the dropdown (mobile friendly).

Twilio messaging uses `/api/sms/*`, `lib/lucy-sms.js`, and `sql/01-sms.sql`. Run the SQL once in Supabase, add the Twilio environment variables, and redeploy. Only confirmed RSVPs with documented SMS consent and supported international-format phone numbers can be sent reminders. Review estimated costs and recipients before sending. Each click sends at most 25 messages. SMS is manual, never automatic.

Security: The admin is password-checked by the server APIs, but this project does not include a rate limiter or production-grade session auth. Add rate limiting before exposing the service broadly.

---

## Personal guest pages (new)

Every guest now gets a private page at **rsvp.lucysquinceanera.com** with their table, check-in pass, role, weekend events, travel plan, shuttles, ride matches, messages to the family, song requests, wishes for Lucy, meals, and an RSVP editor — in Spanish and English. On the day of the party it switches to “Tonight” mode, and afterward to a thank-you page with the photo album.

### How guests get in
- **Personal link:** `rsvp.lucysquinceanera.com/g/<private code>`. Each RSVP has its own long random code. Opening it remembers that phone for 30 days.
- **Name + phone** (same as before) or the existing `?code=` check-in link also works, and also remembers the phone.
- Admin → Edit guest → **Reset link** makes a new link; the old link and any phone signed in with it stop working immediately.

### Setup (once)
1. In Supabase → SQL Editor, run **`sql/02-guest-portal.sql`**. It only adds columns/tables and a private storage bucket (`guest-uploads`); it never deletes data. Every existing RSVP gets a private link code.
2. Vercel environment variables:
   - `RSVP_TOKEN_SECRET` — already required (32+ random characters). Changing it signs everyone out and changes the table QR / DJ links.
   - `PUBLIC_SITE_URL=https://rsvp.lucysquinceanera.com` — recommended; used to build links in texts and QR cards.
   - `FAMILY_NOTIFY_PHONE=+1XXXXXXXXXX` — optional; texts you when a guest sends a message.
   - Twilio variables (already used by the SMS tab) — needed only for texting links, announcements and reply alerts.
3. Upload this ZIP at the repository root (replace contents) and deploy. No new npm packages.
4. In **/admin**:
   - **Programa / Program** → fill in Event details (venue, maps link, dress code, court color, deadlines, meal options, gifts link, thank-you note), the night-of schedule, and page-mode dates. Add events (rehearsal, welcome dinner, misa…) and choose who's invited. Assign court/padrino roles.
   - **Invitados → Editar** → new “Guest page” section: table note, personal note, role, groups (e.g. `court`), shuttle, personal link (copy / preview / reset).
   - **Llegadas / Arrivals** → see who lands when, create shuttles, post announcements (everyone, a group, a hotel or a table) and optionally text them.
   - **Mensajes de invitados / Guest messages** → read and reply to guests.
   - **Program → Text links to confirmed guests** sends each opted-in guest their link, 25 per click, never twice for the same link. Or use **Copy link** per guest.
   - **Program → Print table QR cards** — one card per table; guests scan it to upload photos/videos without signing in.
   - **Program → Copy DJ link** — read-only song list for the DJ (no guest info).
5. Test with your own RSVP first: open your link, try each tab, then use Program → Page mode → Override to preview “Tonight” and the thank-you page. Set the override back to Automatic when done.

### Notes
- New public routes: `/g/[code]`, `/photos/[table code]`, `/dj/[code]`. New APIs under `/api/guest/*`, `/api/photos`, `/api/dj`, `/api/admin/portal`. The old routes still work.
- Photos and wish videos upload straight from the phone to the private Supabase bucket (up to 200 MB each), so large videos don't go through Vercel.
- “Save my pass” shows a full-screen pass with a QR code to screenshot or print. A real Apple/Google Wallet pass needs an Apple Developer / Google Wallet issuer account and certificates, so it isn't included.
- Rate limiting on sign-in, messages and uploads is per server instance (best effort). Add Vercel firewall rules if you need more.
- New tables are locked with row-level security; only the server (service role key) reads or writes them.
