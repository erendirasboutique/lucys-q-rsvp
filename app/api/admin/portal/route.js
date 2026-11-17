// Admin actions for the personal guest pages. Every request is password-checked on the server.
import { NextResponse } from "next/server";
import { verifyAdmin } from "../../_supabase";
import {
  db, fail, serverError, clip, isDate, isTime, BUCKET, getSettings, currentMode, audienceMatch,
  newAccessToken, fingerprint, tableCode, djCode, personalLink, siteUrl, isConfirmed, firstName,
} from "../../../../lib/portal-server";
import { sendBatch, linkMessage, smsConfigured, smsReason, countryOf, reopenFailed, syncStatuses } from "../../../../lib/portal-sms";
import { DEFAULT_LINK_TEXT, DEFAULT_WELCOME_TEXT, renderMessage } from "../../../../lib/link-text";

function contactPhone() {
  const p = String(process.env.SMS_CONTACT_PHONE || "").replace(/[^\d+]/g, "");
  return /^\+\d{10,15}$/.test(p) ? p : null;
}

function cleanTemplate(t, { requireLink = true } = {}) {
  const es = String(t?.es || "").replace(/\r/g, "").trim().slice(0, 1200);
  const en = String(t?.en || "").replace(/\r/g, "").trim().slice(0, 1200);
  if (!es) throw Object.assign(new Error("Write the Spanish message"), { status: 400 });
  if (requireLink && (!/\{\s*link\s*\}/i.test(es) || (en && !/\{\s*link\s*\}/i.test(en)))) throw Object.assign(new Error("Put {link} in the message where their personal link should go"), { status: 400 });
  return { es, en };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_PAGE_FIELDS = {
  table_note: (v) => clip(v, 300) || null,
  personal_note: (v) => clip(v, 2000) || null,
  role_title: (v) => clip(v, 120) || null,
  role_moment: (v) => clip(v, 200) || null,
  role_details: (v) => clip(v, 3000) || null,
  rehearsal_confirmed: (v) => Boolean(v),
  guest_tags: (v) => (Array.isArray(v) ? v : String(v || "").split(",")).map((t) => clip(t, 40).toLowerCase()).filter(Boolean).slice(0, 20),
  hotel: (v) => clip(v, 200) || null,
  arrive_date: (v) => clip(v, 40) || null,
  depart_date: (v) => clip(v, 40) || null,
  flight_number: (v) => clip(v, 20).toUpperCase() || null,
  landing_date: (v) => (isDate(v) ? v : null),
  landing_time: (v) => (isTime(v) ? v : null),
  ride_share_ok: (v) => Boolean(v),
  shuttle_id: (v) => v || null,
  allergies: (v) => clip(v, 1000) || null,
};

async function load(req) {
  const database = db();
  const settings = await getSettings();
  const [events, eventRsvps, shuttles, ann, msgs, songs, votes, wishes, photos, tables] = await Promise.all([
    database.from("portal_events").select("*").order("event_date").order("event_time").order("sort"),
    database.from("portal_event_rsvps").select("event_id,rsvp_id,going"),
    database.from("shuttles").select("*").order("depart_date").order("depart_time"),
    database.from("announcements").select("*").order("created_at", { ascending: false }).limit(100),
    database.from("guest_messages").select("*").order("created_at", { ascending: false }).limit(1000),
    database.from("song_requests").select("*").order("created_at"),
    database.from("song_votes").select("song_id"),
    database.from("wishes").select("*").order("created_at", { ascending: false }),
    database.from("guest_photos").select("*").order("created_at", { ascending: false }).limit(300),
    database.from("rsvps").select("table_number").not("table_number", "is", null),
  ]);
  for (const r of [events, eventRsvps, shuttles, ann, msgs, songs, votes, wishes, photos, tables]) if (r.error) throw r.error;

  // How many guests already got the welcome text and their personal link (tests not counted).
  const sentTo = async (prefix) => {
    const { data, error } = await database.from("sms_outbox").select("campaign_key,rsvp_id,status").like("campaign_key", `${prefix}-%`).limit(10000);
    if (error) return [];
    return [...new Set((data || []).filter((r) => !r.campaign_key.startsWith(`${prefix}-test-`) && !/-failed-\d+$/.test(r.campaign_key) && !["needs_review", "failed", "undelivered"].includes(r.status)).map((r) => r.rsvp_id))];
  };
  const [welcomed, linked] = await Promise.all([sentTo("welcome"), sentTo("link")]);

  const voteCount = {};
  (votes.data || []).forEach((v) => {
    voteCount[v.song_id] = (voteCount[v.song_id] || 0) + 1;
  });

  const sign = async (paths) => {
    if (!paths.length) return {};
    const { data, error } = await database.storage.from(BUCKET).createSignedUrls(paths, 3600 * 6);
    if (error) throw error;
    return Object.fromEntries((data || []).map((d, i) => [paths[i], d.signedUrl]));
  };
  const videoUrls = await sign((wishes.data || []).filter((w) => w.video_path).map((w) => w.video_path));
  const photoUrls = await sign((photos.data || []).map((p) => p.path));

  const labels = [...new Set([...(tables.data || []).map((t) => String(t.table_number).trim()).filter(Boolean), ...Array.from({ length: 12 }, (_, i) => String(i + 1))])]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const base = siteUrl(req);

  return {
    ok: true,
    settings,
    mode: currentMode(settings.mode),
    events: events.data || [],
    eventRsvps: eventRsvps.data || [],
    shuttles: shuttles.data || [],
    announcements: ann.data || [],
    messages: msgs.data || [],
    songs: (songs.data || []).map((s) => ({ ...s, votes: voteCount[s.id] || 0 })).sort((a, b) => b.votes - a.votes),
    wishes: (wishes.data || []).map((w) => ({ ...w, video_url: w.video_path ? videoUrls[w.video_path] || null : null })),
    photos: (photos.data || []).map((p) => ({ ...p, url: photoUrls[p.path] || null })),
    tableCards: labels.map((label) => ({ label, url: `${base}/photos/${tableCode(label)}` })),
    djUrl: `${base}/dj/${djCode()}`,
    siteUrl: base,
    smsReady: smsConfigured(),
    contactCard: { ready: Boolean(contactPhone()), phone: contactPhone(), url: `${base}/contact.vcf` },
    textStats: { welcomed, linked },
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!verifyAdmin(body.password)) return fail("Wrong password", 401);
    const database = db();
    const ok = (extra = {}) => NextResponse.json({ ok: true, ...extra });

    switch (body.action) {
      case "load":
        return NextResponse.json(await load(req), { headers: { "Cache-Control": "no-store" } });

      case "save-settings": {
        if (!["event", "mode", "schedule", "link_text", "welcome_text"].includes(body.key)) return fail("Unknown setting");
        if (body.key === "link_text") body.value = cleanTemplate(body.value);
        if (body.key === "welcome_text") body.value = cleanTemplate(body.value, { requireLink: false });
        const value = body.value ?? {};
        if (JSON.stringify(value).length > 20000) return fail("Too long");
        const { error } = await database.from("portal_settings").upsert({ key: body.key, value, updated_at: new Date().toISOString() });
        if (error) throw error;
        return ok();
      }

      case "save-guest": {
        if (!body.id) return fail("Missing guest");
        const update = {};
        for (const [k, fn] of Object.entries(GUEST_PAGE_FIELDS)) if (body.fields && k in body.fields) update[k] = fn(body.fields[k]);
        update.updated_at = new Date().toISOString();
        const { data, error } = await database.from("rsvps").update(update).eq("id", body.id).select("*").single();
        if (error) throw error;
        return ok({ rsvp: data });
      }

      case "reset-link": {
        const { data, error } = await database
          .from("rsvps")
          .update({ access_token: newAccessToken(), access_token_created_at: new Date().toISOString() })
          .eq("id", body.id)
          .select("*")
          .single();
        if (error) throw error;
        return ok({ rsvp: data });
      }

      case "text-links": {
        const ids = Array.isArray(body.ids) ? body.ids.slice(0, 500) : [];
        // Message: the one sent with this click (saved for next time), else the saved one, else the default.
        let template;
        if (body.template) {
          template = cleanTemplate(body.template);
          await database.from("portal_settings").upsert({ key: "link_text", value: template, updated_at: new Date().toISOString() });
        } else {
          template = (await getSettings()).linkText || DEFAULT_LINK_TEXT;
        }
        // Each guest gets each "round" once. A test always sends.
        const round = body.test ? `test-${Date.now()}` : String(body.round || "invite-1").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30) || "invite-1";
        let query = database.from("rsvps").select("*");
        if (ids.length) query = query.in("id", ids);
        const { data, error } = await query.limit(2000);
        if (error) throw error;
        const country = ["us", "mx"].includes(body.country) ? body.country : null;
        const rows = (data || []).filter((r) => r.access_token && (ids.length || isConfirmed(r)) && (!country || countryOf(r) === country));
        const items = rows.map((r) => ({ rsvp: r, campaignKey: `link-${round}-${r.id}-${fingerprint(r.access_token).slice(0, 8)}`, message: linkMessage(r, personalLink(req, r), template) }));
        const reopened = body.retryFailed && !body.test ? await reopenFailed(items.map((i) => i.campaignKey)) : 0;
        const result = await sendBatch(items, 25);
        result.reopened = reopened;
        const waiting = items.filter((i) => !smsReason(i.rsvp)).length - result.submitted - result.failed;
        return ok({ ...result, note: `${result.reopened ? `Retried ${result.reopened} that failed before. ` : ""}Texted ${result.submitted}. ${result.failed ? result.failed + " need review in SMS history. " : ""}${result.skipped ? result.skipped + " skipped (already texted, not opted in, or no valid phone)." : ""}${waiting > 25 ? " Click again for the next 25." : ""}` });
      }

      case "text-welcome": {
        // Welcome text + contact card. Goes to guests who opted in to texts and haven't said No.
        const ids = Array.isArray(body.ids) ? body.ids.slice(0, 500) : [];
        let template;
        if (body.template) {
          template = cleanTemplate(body.template, { requireLink: false });
          await database.from("portal_settings").upsert({ key: "welcome_text", value: template, updated_at: new Date().toISOString() });
        } else {
          template = (await getSettings()).welcomeText || DEFAULT_WELCOME_TEXT;
        }
        const attachCard = body.attachCard !== false;
        if (attachCard && !contactPhone()) return fail("Add SMS_CONTACT_PHONE in Vercel (the number guests should save, e.g. +13105551234) to send the contact card.");
        const round = body.test ? `test-${Date.now()}` : String(body.round || "welcome-1").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30) || "welcome-1";
        const confirmedOnly = body.audience === "confirmed";
        let query = database.from("rsvps").select("*");
        if (ids.length) query = query.in("id", ids);
        const { data, error } = await query.limit(2000);
        if (error) throw error;
        const base = siteUrl(req);
        const contactUrl = `${base}/contact.vcf`;
        const country = ["us", "mx"].includes(body.country) ? body.country : null;
        const items = (data || []).filter((r) => !country || countryOf(r) === country).map((r) => ({
          rsvp: r,
          campaignKey: `welcome-${round}-${r.id}`,
          message: renderMessage(template, r, r.access_token ? personalLink(req, r) : base, { fallback: DEFAULT_WELCOME_TEXT }),
          ...(attachCard ? { mediaUrl: contactUrl, contactUrl } : {}),
        }));
        const reopened = body.retryFailed && !body.test ? await reopenFailed(items.map((i) => i.campaignKey)) : 0;
        const result = await sendBatch(items, 25, { allowPending: !confirmedOnly || Boolean(body.test) });
        return ok({
          ...result,
          reopened,
          note: `${reopened ? `Retried ${reopened} that failed before. ` : ""}Sent ${result.submitted}${result.mms ? ` (${result.mms} with the contact card attached)` : ""}. ${result.failed ? result.failed + " need review in SMS history. " : ""}${result.skipped ? result.skipped + " skipped (already welcomed, not opted in, said No, or no valid phone)." : ""}${result.submitted === 25 ? " Click again for the next 25." : ""}`,
        });
      }

      case "sync-status": {
        const prefixes = (Array.isArray(body.prefixes) ? body.prefixes : ["welcome", "link"]).filter((p) => ["welcome", "link"].includes(p));
        return ok(await syncStatuses(prefixes));
      }

      case "save-event": {
        const e = body.event || {};
        if (!clip(e.title_es, 200) || !isDate(e.event_date)) return fail("Add a name and a date");
        const row = {
          title_es: clip(e.title_es, 200),
          title_en: clip(e.title_en, 200) || null,
          event_date: e.event_date,
          event_time: isTime(e.event_time) ? e.event_time : null,
          duration_minutes: Math.min(Math.max(Number(e.duration_minutes) || 120, 15), 1440),
          location: clip(e.location, 300) || null,
          maps_url: /^https:\/\//.test(String(e.maps_url || "")) ? clip(e.maps_url, 500) : null,
          audience: clip(e.audience, 100) || "all",
          ask_rsvp: Boolean(e.ask_rsvp),
          sort: Number(e.sort) || 0,
        };
        const q = e.id ? database.from("portal_events").update(row).eq("id", e.id) : database.from("portal_events").insert(row);
        const { error } = await q;
        if (error) throw error;
        return ok();
      }
      case "delete-event": {
        const { error } = await database.from("portal_events").delete().eq("id", body.id);
        if (error) throw error;
        return ok();
      }

      case "save-shuttle": {
        const s = body.shuttle || {};
        if (!clip(s.label, 100)) return fail("Name the shuttle");
        const row = {
          label: clip(s.label, 100),
          depart_date: isDate(s.depart_date) ? s.depart_date : null,
          depart_time: isTime(s.depart_time) ? s.depart_time : null,
          from_place: clip(s.from_place, 200) || null,
          to_place: clip(s.to_place, 200) || null,
          seats: Math.min(Math.max(Number(s.seats) || 14, 1), 500),
          notes: clip(s.notes, 500) || null,
        };
        const q = s.id ? database.from("shuttles").update(row).eq("id", s.id) : database.from("shuttles").insert(row);
        const { error } = await q;
        if (error) throw error;
        return ok();
      }
      case "delete-shuttle": {
        await database.from("rsvps").update({ shuttle_id: null }).eq("shuttle_id", body.id);
        const { error } = await database.from("shuttles").delete().eq("id", body.id);
        if (error) throw error;
        return ok();
      }

      case "post-announcement": {
        const text = clip(body.body, 600);
        if (!text) return fail("Write the announcement");
        const { data, error } = await database.from("announcements").insert({ body: text, audience: clip(body.audience, 120) || "all" }).select("*").single();
        if (error) throw error;
        return ok({ announcement: data });
      }
      case "delete-announcement": {
        const { error } = await database.from("announcements").delete().eq("id", body.id);
        if (error) throw error;
        return ok();
      }
      case "text-announcement": {
        const { data: a, error } = await database.from("announcements").select("*").eq("id", body.id).single();
        if (error) throw error;
        const { data: rows, error: e2 } = await database.from("rsvps").select("*").limit(2000);
        if (e2) throw e2;
        const targets = (rows || []).filter((r) => audienceMatch(a.audience, r));
        const items = targets.map((r) => ({
          rsvp: r,
          campaignKey: `ann-${a.id}`,
          message: `${a.body}${r.access_token ? ` Más info: ${personalLink(req, r)}` : ""}`,
        }));
        const result = await sendBatch(items, 25);
        return ok({ ...result, note: `Texted ${result.submitted}. ${result.skipped} skipped (already texted, not opted in, or no valid phone).${result.submitted === 25 ? " Click again for the next 25." : ""}` });
      }

      case "reply": {
        const text = clip(body.body, 2000);
        if (!text || !body.rsvp_id) return fail("Write a reply");
        const { data, error } = await database.from("guest_messages").insert({ rsvp_id: body.rsvp_id, sender: "family", body: text, read_by_family_at: new Date().toISOString() }).select("*").single();
        if (error) throw error;
        await database.from("guest_messages").update({ read_by_family_at: new Date().toISOString() }).eq("rsvp_id", body.rsvp_id).is("read_by_family_at", null);
        let note = "";
        if (body.text) {
          const { data: r } = await database.from("rsvps").select("*").eq("id", body.rsvp_id).single();
          if (r) {
            try {
              const result = await sendBatch([{ rsvp: r, campaignKey: `reply-${data.id}`, message: `Hola ${firstName(r.full_name)}! La familia de Lucy respondió tu mensaje: ${personalLink(req, r)}` }], 1);
              note = result.submitted ? "Texted them a heads-up." : `Not texted: ${result.notes[0] || "already texted or not opted in"}.`;
            } catch (e) {
              note = `Not texted: ${e.message}`;
            }
          }
        }
        return ok({ message: data, note });
      }
      case "mark-read": {
        const { error } = await database.from("guest_messages").update({ read_by_family_at: new Date().toISOString() }).eq("rsvp_id", body.rsvp_id).is("read_by_family_at", null);
        if (error) throw error;
        return ok();
      }

      case "hide-song": {
        const { error } = await database.from("song_requests").update({ hidden: Boolean(body.hidden) }).eq("id", body.id);
        if (error) throw error;
        return ok();
      }
      case "hide-photo": {
        const { error } = await database.from("guest_photos").update({ hidden: Boolean(body.hidden) }).eq("id", body.id);
        if (error) throw error;
        return ok();
      }

      default:
        return fail("Unknown action");
    }
  } catch (e) {
    console.error("Admin portal failed", e);
    return NextResponse.json({ ok: false, error: e?.message || "Something went wrong" }, { status: e?.status || 500 });
  }
}
