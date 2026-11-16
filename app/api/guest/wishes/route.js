// Save a wish for Lucy (text, optional video already uploaded with /api/guest/upload).
import { NextResponse } from "next/server";
import { currentGuest, unauthorized, fail, serverError, db, clip, checkUploadTicket, rateLimited } from "../../../../lib/portal-server";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const me = await currentGuest(req);
    if (!me) return unauthorized();
    if (rateLimited(req, "wish", 6)) return fail("Please wait a minute and try again.", 429);
    const body = await req.json();
    const text = clip(body.body, 4000);
    let videoPath = null;
    if (body.video_path) {
      if (!String(body.video_path).startsWith(`wishes/${me.id}/`) || !checkUploadTicket(body.video_path, body.ticket)) return fail("Video upload not found");
      videoPath = body.video_path;
    }
    if (!text && !videoPath) return fail("Write a message or add a video.");
    const { error } = await db().from("wishes").insert({ rsvp_id: me.id, from_name: clip(body.from_name, 200) || me.full_name, body: text || null, video_path: videoPath });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError("Wish failed", e);
  }
}
