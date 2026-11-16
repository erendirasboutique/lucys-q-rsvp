// Party photos: record an upload, or list the latest photos.
// Works for a signed-in guest, or anyone holding a table's printed QR code.
import { NextResponse } from "next/server";
import { currentGuest, fail, serverError, db, BUCKET, readTableCode, checkUploadTicket } from "../../../lib/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const me = await currentGuest(req);
    const table = body.tableCode ? readTableCode(body.tableCode) : null;
    if (!me && !table) return fail("This photo link isn't valid.", 403);
    const database = db();

    if (body.action === "record") {
      const path = String(body.path || "");
      if (!path.startsWith("photos/") || !checkUploadTicket(path, body.ticket)) return fail("Upload not found");
      const { error } = await database.from("guest_photos").upsert(
        { path, rsvp_id: me?.id || null, table_label: table || me?.table_number || null, content_type: String(body.contentType || "").slice(0, 60) },
        { onConflict: "path" }
      );
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (body.action === "list") {
      const { data, error, count } = await database
        .from("guest_photos")
        .select("path,content_type,table_label,created_at", { count: "exact" })
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      let photos = [];
      if (data?.length) {
        const { data: signed, error: se } = await database.storage.from(BUCKET).createSignedUrls(data.map((p) => p.path), 3600);
        if (se) throw se;
        photos = data.map((p, i) => ({ url: signed?.[i]?.signedUrl || null, video: String(p.content_type || "").startsWith("video/"), table: p.table_label, created_at: p.created_at })).filter((p) => p.url);
      }
      return NextResponse.json({ ok: true, table: table || me?.table_number || null, total: count || 0, photos });
    }
    return fail("Unknown action");
  } catch (e) {
    return serverError("Photos failed", e);
  }
}
