// Everything the signed-in guest's page needs, in one request.
import { NextResponse } from "next/server";
import { currentGuest, unauthorized, serverError, db, getSettings, currentMode, audienceMatch, tableCode, firstName } from "../../../../lib/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GUEST_FIELDS = [
  "id", "full_name", "phone", "attending", "guest_count", "travel_from", "additional_guests", "confirmed_guests", "comments",
  "table_number", "checkin_code", "checked_in", "checked_in_at", "updated_at", "preferred_language",
  "table_note", "personal_note", "role_title", "role_moment", "role_details", "rehearsal_confirmed", "guest_tags",
  "hotel", "arrive_date", "depart_date", "flight_number", "landing_date", "landing_time", "ride_share_ok", "shuttle_id",
  "checklist", "meals", "allergies", "sms_opt_in",
];

const minutes = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export async function GET(req) {
  try {
    const me = await currentGuest(req);
    if (!me) return unauthorized();
    const database = db();
    const settings = await getSettings();

    const [ann, events, myEvents, shuttles, seatRows, messages, songs, votes, wishes] = await Promise.all([
      database.from("announcements").select("id,body,audience,created_at").order("created_at", { ascending: false }).limit(30),
      database.from("portal_events").select("*").order("event_date").order("event_time").order("sort"),
      database.from("portal_event_rsvps").select("event_id,going").eq("rsvp_id", me.id),
      database.from("shuttles").select("*").order("depart_date").order("depart_time"),
      database.from("rsvps").select("shuttle_id,guest_count").not("shuttle_id", "is", null),
      database.from("guest_messages").select("id,sender,category,body,created_at,read_by_guest_at").eq("rsvp_id", me.id).order("created_at"),
      database.from("song_requests").select("id,title,artist,rsvp_id,created_at").eq("hidden", false).order("created_at"),
      database.from("song_votes").select("song_id,rsvp_id"),
      database.from("wishes").select("id,from_name,body,video_path,created_at").eq("rsvp_id", me.id).order("created_at", { ascending: false }),
    ]);
    for (const r of [ann, events, myEvents, shuttles, seatRows, messages, songs, votes, wishes]) if (r.error) throw r.error;

    const going = Object.fromEntries((myEvents.data || []).map((e) => [e.event_id, e.going]));
    const taken = {};
    (seatRows.data || []).forEach((r) => {
      taken[r.shuttle_id] = (taken[r.shuttle_id] || 0) + Number(r.guest_count || 0);
    });

    // Other guests who said they're open to sharing a ride and land within 90 minutes of this party.
    let rideMatches = [];
    if (me.ride_share_ok && me.landing_date && minutes(me.landing_time) !== null) {
      const { data, error } = await database
        .from("rsvps")
        .select("id,full_name,guest_count,landing_time,hotel,flight_number")
        .eq("landing_date", me.landing_date)
        .eq("ride_share_ok", true)
        .neq("id", me.id)
        .limit(200);
      if (error) throw error;
      const mine = minutes(me.landing_time);
      rideMatches = (data || [])
        .filter((r) => minutes(r.landing_time) !== null && Math.abs(minutes(r.landing_time) - mine) <= 90)
        .sort((a, b) => Math.abs(minutes(a.landing_time) - mine) - Math.abs(minutes(b.landing_time) - mine))
        .slice(0, 5)
        .map((r) => {
          const parts = String(r.full_name || "").trim().split(/\s+/);
          return {
            name: `${parts[0] || ""}${parts.length > 1 ? " " + parts[parts.length - 1][0] + "." : ""}`,
            guest_count: r.guest_count,
            landing_time: r.landing_time,
            hotel: r.hotel || "",
            minutes_apart: minutes(r.landing_time) - mine,
          };
        });
    }

    const voteCount = {};
    const myVotes = new Set();
    (votes.data || []).forEach((v) => {
      voteCount[v.song_id] = (voteCount[v.song_id] || 0) + 1;
      if (v.rsvp_id === me.id) myVotes.add(v.song_id);
    });
    const songList = (songs.data || [])
      .map((s) => ({ id: s.id, title: s.title, artist: s.artist, votes: voteCount[s.id] || 0, voted: myVotes.has(s.id), mine: s.rsvp_id === me.id }))
      .sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title))
      .slice(0, 40);

    const guest = Object.fromEntries(GUEST_FIELDS.map((k) => [k, me[k] ?? null]));
    guest.first_name = firstName(me.full_name);

    return NextResponse.json(
      {
        ok: true,
        guest,
        mode: currentMode(settings.mode),
        eventDate: settings.mode?.tonight_date || "2027-01-04",
        event: settings.event,
        schedule: settings.schedule,
        announcements: (ann.data || []).filter((a) => audienceMatch(a.audience, me)).slice(0, 5),
        events: (events.data || []).filter((e) => audienceMatch(e.audience, me)).map((e) => ({ ...e, going: going[e.id] ?? null })),
        shuttles: (shuttles.data || []).map((s) => ({ ...s, seats_taken: taken[s.id] || 0 })),
        rideMatches,
        messages: messages.data || [],
        songs: songList,
        wishes: (wishes.data || []).map((w) => ({ id: w.id, from_name: w.from_name, body: w.body, has_video: Boolean(w.video_path), created_at: w.created_at })),
        photoCode: me.table_number ? tableCode(me.table_number) : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return serverError("Guest page load failed", e);
  }
}
