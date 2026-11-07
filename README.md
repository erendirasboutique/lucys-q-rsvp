# Lucy XV — SMS as an Admin Tab

This patch uses the exact `app/admin/page.js` supplied in chat. It **preserves that page's existing demo seating features** and embeds the Twilio SMS manager in a **Messages** tab at `/admin`.

## Important warning about the supplied admin

The supplied admin page is a **demo**: its guest data is hardcoded, table assignments and announcements are local state, and its password check was hardcoded in the browser. This patch removes the displayed hardcoded password and uses `ADMIN_PASSWORD` to authenticate the SMS API requests, but **the surrounding admin page is still not server-authenticated**. Do not treat its seating/announcement data as live. Protect `/admin` with real server-side auth before production use.

The SMS panel **does** query your live Supabase `rsvps` table through protected API endpoints. It does not use the six sample guests on the dashboard.

## Installation

1. Back up your repository. Merge the ZIP folders at the repository root. **Replace only `app/admin/page.js` with this patch** if it still matches the code you pasted. Preserve other existing app files.
2. `npm install twilio @supabase/supabase-js` and commit `package.json` and the lockfile.
3. Run `sql/01-sms.sql` in Supabase SQL Editor.
4. In Vercel set server-side `ADMIN_PASSWORD`, `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_KEY_SECRET`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`, `SMS_PUBLIC_BASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` (or the alternate names described in `lib/lucy-sms.js`). `SMS_ESTIMATED_USD_PER_SEGMENT` is optional and must be a verified estimate; rates vary by destination.
5. Redeploy, open `/admin`, enter `ADMIN_PASSWORD`, choose **Messages**, and click **Load recipients & history**.
6. **Do not send until you have documented affirmative SMS consent**. Existing rows are not opted in by default. Add an unchecked consent field to Typeform and record it in the webhook, or collect consent independently. See SQL and prior README guidance.
7. Test with one consented RSVP and a phone number you own. Verify the Twilio callback is reachable at `/api/sms/status`.

## Behavior

- Confirmed RSVP records only, one message per eligible +1/+52 phone number.
- Preview of exclusions, message, segment count, and optional approximate base cost.
- 25 sends maximum per request, repeat for remaining eligible recipients.
- Unique campaign/phone database reservation prevents repeat sends, including uncertain failures (which need manual review).
- Signed Twilio delivery callbacks and message history.
- No messages are sent simply by deploying or opening the tab.

## Known limitations

- SMS opt-in is not automatically collected; you must wire it into Typeform.
- This patch does not convert the supplied demo admin seating/announcements into Supabase-backed features.
- Twilio international sender restrictions and pricing must be checked for Mexico numbers.
- Browser password entry is used for SMS requests; a proper authenticated admin session is recommended before production.
- A single configured SMS segment price is only an estimate, not a live quote.
- No automatic retry of failed or uncertain submissions.
