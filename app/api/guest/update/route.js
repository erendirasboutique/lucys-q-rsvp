// Guest saves part of their page: RSVP, travel, ride, checklist, meals, rehearsal, event replies, language.
import { NextResponse } from "next/server";
import { currentGuest, unauthorized, fail, serverError, db, clip, isDate, isTime, audienceMatch } from "../../../../lib/portal-server";

export const runtime = "nodejs";

const CHECKLIST_KEYS = ["passports", "pesos", "bank", "phone", "outfits", "sunscreen", "hotel", "flights"];

export async function POST(req) {
  try {
    const me = await currentGuest(req);
    if (!me) return unauthorized();
    const { section, data = {} } = await req.json();
    const database = db();
    let update = null;

    switch (section) {
      case "rsvp": {
        const count = Number(data.guest_count);
        if (!Number.isInteger(count) || count < 1 || count > 30) return fail("Invalid guest count");
        update = {
          attending: clip(data.attending, 100),
          guest_count: count,
          travel_from: clip(data.travel_from, 300),
          additional_guests: clip(data.additional_guests, 3000),
          confirmed_guests: clip(data.confirmed_guests, 3000),
          comments: clip(data.comments, 3000),
        };
        break;
      }
      case "travel": {
        if (data.landing_date && !isDate(data.landing_date)) return fail("Pick a landing date");
        if (data.landing_time && !isTime(data.landing_time)) return fail("Pick a landing time");
        update = {
          hotel: clip(data.hotel, 200),
          arrive_date: clip(data.arrive_date, 40),
          depart_date: clip(data.depart_date, 40),
          flight_number: clip(data.flight_number, 20).toUpperCase(),
          landing_date: data.landing_date || null,
          landing_time: data.landing_time || null,
          ride_share_ok: Boolean(data.ride_share_ok),
        };
        if (data.travel_from !== undefined) update.travel_from = clip(data.travel_from, 300);
        break;
      }
      case "shuttle": {
        const id = data.shuttle_id || null;
        if (id) {
          const { data: shuttle, error } = await database.from("shuttles").select("id,seats").eq("id", id).maybeSingle();
          if (error) throw error;
          if (!shuttle) return fail("That shuttle no longer exists");
          const { data: riders, error: e2 } = await database.from("rsvps").select("id,guest_count").eq("shuttle_id", id);
          if (e2) throw e2;
          const taken = (riders || []).filter((r) => r.id !== me.id).reduce((n, r) => n + Number(r.guest_count || 0), 0);
          if (taken + Number(me.guest_count || 1) > Number(shuttle.seats || 0)) return fail("not_enough_seats");
        }
        update = { shuttle_id: id };
        break;
      }
      case "checklist": {
        const list = {};
        CHECKLIST_KEYS.forEach((k) => {
          list[k] = Boolean(data[k]);
        });
        update = { checklist: list };
        break;
      }
      case "meals": {
        if (!Array.isArray(data.meals) || data.meals.length > 30) return fail("Invalid meals");
        update = {
          meals: data.meals.map((m) => ({ name: clip(m.name, 80), meal: clip(m.meal, 80), kid: Boolean(m.kid) })),
          allergies: clip(data.allergies, 1000),
        };
        break;
      }
      case "rehearsal":
        update = { rehearsal_confirmed: Boolean(data.confirmed) };
        break;
      case "language":
        update = { preferred_language: data.lang === "en" ? "en" : "es" };
        break;
      case "event": {
        const { data: ev, error } = await database.from("portal_events").select("id,audience,ask_rsvp").eq("id", data.event_id).maybeSingle();
        if (error) throw error;
        if (!ev || !ev.ask_rsvp || !audienceMatch(ev.audience, me)) return fail("Event not found", 404);
        const { error: e2 } = await database
          .from("portal_event_rsvps")
          .upsert({ event_id: ev.id, rsvp_id: me.id, going: Boolean(data.going), updated_at: new Date().toISOString() });
        if (e2) throw e2;
        return NextResponse.json({ ok: true });
      }
      default:
        return fail("Unknown section");
    }

    update.updated_at = new Date().toISOString();
    const { error } = await database.from("rsvps").update(update).eq("id", me.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("Guest update failed", e);
  }
}
