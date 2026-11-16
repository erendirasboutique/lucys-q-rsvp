// Song requests and votes.
import { NextResponse } from "next/server";
import { currentGuest, unauthorized, fail, serverError, db, clip, rateLimited } from "../../../../lib/portal-server";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const me = await currentGuest(req);
    if (!me) return unauthorized();
    const body = await req.json();
    const database = db();

    if (body.action === "add") {
      if (rateLimited(req, "song", 10)) return fail("Please wait a minute before adding more songs.", 429);
      const title = clip(body.title, 120);
      const artist = clip(body.artist, 120);
      if (title.length < 2) return fail("Add the song name.");
      const { count, error: ce } = await database.from("song_requests").select("id", { count: "exact", head: true }).eq("rsvp_id", me.id);
      if (ce) throw ce;
      if ((count || 0) >= 15) return fail("You've added 15 songs — vote for others instead!");
      // If the same song is already on the list, just vote for it.
      const { data: existing, error: ee } = await database.from("song_requests").select("id").ilike("title", title).eq("hidden", false).limit(1);
      if (ee) throw ee;
      let songId = existing?.[0]?.id;
      if (!songId) {
        const { data, error } = await database.from("song_requests").insert({ title, artist: artist || null, rsvp_id: me.id }).select("id").single();
        if (error) throw error;
        songId = data.id;
      }
      const { error: ve } = await database.from("song_votes").upsert({ song_id: songId, rsvp_id: me.id });
      if (ve) throw ve;
      return NextResponse.json({ ok: true });
    }

    if (body.action === "vote") {
      if (!body.id) return fail("Missing song");
      if (body.on) {
        const { error } = await database.from("song_votes").upsert({ song_id: body.id, rsvp_id: me.id });
        if (error) throw error;
      } else {
        const { error } = await database.from("song_votes").delete().eq("song_id", body.id).eq("rsvp_id", me.id);
        if (error) throw error;
      }
      return NextResponse.json({ ok: true });
    }
    return fail("Unknown action");
  } catch (e) {
    return serverError("Song request failed", e);
  }
}
