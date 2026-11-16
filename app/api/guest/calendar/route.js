// Calendar file (.ics) with the events this guest is invited to.
import { currentGuest, unauthorized, serverError, db, audienceMatch, getSettings, EVENT_TZ } from "../../../../lib/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => "\\" + m);
const stamp = (d, t) => `${d.replace(/-/g, "")}T${(t || "00:00").replace(":", "")}00`;

function addMinutes(date, time, mins) {
  const [h, m] = (time || "00:00").split(":").map(Number);
  const d = new Date(Date.UTC(...date.split("-").map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))), h, m + mins));
  const iso = d.toISOString();
  return stamp(iso.slice(0, 10), iso.slice(11, 16));
}

export async function GET(req) {
  try {
    const me = await currentGuest(req);
    if (!me) return unauthorized();
    const lang = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "es";
    const settings = await getSettings();
    const { data, error } = await db().from("portal_events").select("*").order("event_date").order("event_time");
    if (error) throw error;
    const events = (data || []).filter((e) => audienceMatch(e.audience, me));
    if (!events.length && settings.mode?.tonight_date) {
      events.push({ id: "main", title_es: "Quinceañera de Lucy", title_en: "Lucy's Quinceañera", event_date: settings.mode.tonight_date, event_time: "16:30", duration_minutes: 390, location: [settings.event.venue_name, settings.event.venue_address].filter(Boolean).join(", ") });
    }
    const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lucys Quinceanera//Guest Page//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    for (const e of events) {
      const title = lang === "en" ? e.title_en || e.title_es : e.title_es;
      lines.push("BEGIN:VEVENT", `UID:${e.id}-${me.id}@lucysquinceanera.com`, `DTSTAMP:${now}`);
      if (e.event_time) {
        lines.push(`DTSTART;TZID=${EVENT_TZ}:${stamp(e.event_date, e.event_time)}`, `DTEND;TZID=${EVENT_TZ}:${addMinutes(e.event_date, e.event_time, Number(e.duration_minutes || 120))}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${e.event_date.replace(/-/g, "")}`);
      }
      lines.push(`SUMMARY:${esc(title)}`);
      if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
      if (e.maps_url) lines.push(`URL:${esc(e.maps_url)}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return new Response(lines.join("\r\n"), {
      headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="lucys-quinceanera.ics"', "Cache-Control": "no-store" },
    });
  } catch (e) {
    return serverError("Calendar failed", e);
  }
}
