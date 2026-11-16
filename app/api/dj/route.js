// Read-only song list for the DJ (no guest names or info).
import { NextResponse } from "next/server";
import { fail, serverError, db, djCode, rateLimited } from "../../../lib/portal-server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    if (rateLimited(req, "dj", 30)) return fail("Slow down", 429);
    const { code } = await req.json();
    const a = Buffer.from(String(code || ""));
    const b = Buffer.from(djCode());
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail("This DJ link isn't valid.", 403);
    const database = db();
    const [songs, votes] = await Promise.all([
      database.from("song_requests").select("id,title,artist,created_at").eq("hidden", false),
      database.from("song_votes").select("song_id"),
    ]);
    if (songs.error) throw songs.error;
    if (votes.error) throw votes.error;
    const count = {};
    (votes.data || []).forEach((v) => {
      count[v.song_id] = (count[v.song_id] || 0) + 1;
    });
    const list = (songs.data || []).map((s) => ({ title: s.title, artist: s.artist, votes: count[s.id] || 0, created_at: s.created_at })).sort((x, y) => y.votes - x.votes);
    return NextResponse.json({ ok: true, songs: list });
  } catch (e) {
    return serverError("DJ list failed", e);
  }
}
