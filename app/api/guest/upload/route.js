// Gives the phone a one-time signed URL to upload a wish video or party photo straight to Supabase Storage
// (so big videos never pass through Vercel).
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { currentGuest, fail, serverError, db, BUCKET, readTableCode, uploadTicket, rateLimited } from "../../../../lib/portal-server";

export const runtime = "nodejs";

const EXT = {
  "image/jpeg": "jpg", "image/png": "png", "image/heic": "heic", "image/heif": "heif", "image/webp": "webp", "image/gif": "gif",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm", "video/3gpp": "3gp",
};

export async function POST(req) {
  try {
    if (rateLimited(req, "upload", 60)) return fail("Too many uploads at once. Wait a minute and try again.", 429);
    const { kind, contentType, tableCode } = await req.json();
    const type = String(contentType || "").toLowerCase();
    const ext = EXT[type] || (type.startsWith("image/") ? "img" : type.startsWith("video/") ? "vid" : null);
    if (!ext) return fail("Only photos and videos can be uploaded.");
    const id = crypto.randomUUID();
    let path;

    if (kind === "wish") {
      const me = await currentGuest(req);
      if (!me) return fail("signed_out", 401);
      if (!type.startsWith("video/")) return fail("Wishes can include a video.");
      path = `wishes/${me.id}/${id}.${ext}`;
    } else if (kind === "photo") {
      const me = await currentGuest(req);
      const table = tableCode ? readTableCode(tableCode) : me?.table_number;
      if (!table && !me) return fail("This photo link isn't valid.", 403);
      const folder = String(table || "guests").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "table";
      path = `photos/${folder}/${id}.${ext}`;
    } else {
      return fail("Unknown upload");
    }

    const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    return NextResponse.json({ ok: true, signedUrl: data.signedUrl, path, ticket: uploadTicket(path) });
  } catch (e) {
    return serverError("Upload URL failed", e);
  }
}
