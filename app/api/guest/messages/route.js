// Guest writes to Lucy's family, or marks the family's replies as read.
import { NextResponse } from "next/server";
import { currentGuest, unauthorized, fail, serverError, db, clip, rateLimited } from "../../../../lib/portal-server";
import { notifyFamily } from "../../../../lib/portal-sms";

export const runtime = "nodejs";
const CATEGORIES = ["question", "song", "note"];

export async function POST(req) {
  try {
    const me = await currentGuest(req);
    if (!me) return unauthorized();
    const body = await req.json();
    const database = db();

    if (body.action === "read") {
      const { error } = await database
        .from("guest_messages")
        .update({ read_by_guest_at: new Date().toISOString() })
        .eq("rsvp_id", me.id)
        .eq("sender", "family")
        .is("read_by_guest_at", null);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (rateLimited(req, "msg", 8)) return fail("Please wait a minute before sending another message.", 429);
    const text = clip(body.body, 2000);
    if (text.length < 1) return fail("Write a message first.");
    const category = CATEGORIES.includes(body.category) ? body.category : "question";
    const { data, error } = await database
      .from("guest_messages")
      .insert({ rsvp_id: me.id, sender: "guest", category, body: text })
      .select("id,sender,category,body,created_at,read_by_guest_at")
      .single();
    if (error) throw error;
    await notifyFamily(`New message from ${me.full_name} on Lucy's guest page: "${text.slice(0, 120)}"`);
    return NextResponse.json({ ok: true, message: data });
  } catch (e) {
    return serverError("Guest message failed", e);
  }
}
