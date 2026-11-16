// Admin actions for the personal guest pages. Every request is password-checked on the server.
import { NextResponse } from "next/server";
import { verifyAdmin } from "../../_supabase";
import {
  db, fail, serverError, clip, isDate, isTime, BUCKET, getSettings, currentMode, audienceMatch,
  newAccessToken, fingerprint, tableCode, djCode, personalLink, siteUrl, isConfirmed, firstName,
} from "../../../../lib/portal-server";
import { sendBatch, linkMessage, smsConfigured, smsReason } from "../../../../lib/portal-sms";

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
        if (!["event", "mode", "schedule"].includes(body.key)) return fail("Unknown setting");
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
        let query = database.from("rsvps").select("*");
        if (ids.length) query = query.in("id", ids);
        const { data, error } = await query.limit(2000);
        if (error) throw error;
        const rows = (data || []).filter((r) => r.access_token && (ids.length || isConfirmed(r)));
        const items = rows.map((r) => ({ rsvp: r, campaignKey: `link-${r.id}-${fingerprint(r.access_token).slice(0, 8)}`, message: linkMessage(r, personalLink(req, r)) }));
        const result = await sendBatch(items, 25);
        const waiting = items.filter((i) => !smsReason(i.rsvp)).length - result.submitted - result.failed;
        return ok({ ...result, note: `Texted ${result.submitted}. ${result.failed ? result.failed + " need review in SMS history. " : ""}${result.skipped ? result.skipped + " skipped (already texted, not opted in, or no valid phone)." : ""}${waiting > 25 ? " Click again for the next 25." : ""}` });
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
          message: `Lucy's Quinceañera: ${a.body}${r.access_token ? ` Más info: ${personalLink(req, r)}` : ""}`,
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
    return NextResponse.json({ ok: false, error: e?.message || "Something went wrong" }, { status: 500 });
  }
}
