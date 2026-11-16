// Personal link: rsvp.lucysquinceanera.com/g/<private code>
// Opening it signs the guest in on this phone for 30 days, then shows their page.
import { NextResponse } from "next/server";
import { db, setSessionCookie, rateLimited, siteUrl } from "../../../lib/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { token } = await params;
  const home = siteUrl(req);
  if (rateLimited(req, "link", 30) || !/^[a-f0-9]{32,128}$/i.test(String(token || ""))) {
    return NextResponse.redirect(`${home}/?link=invalid`, 303);
  }
  try {
    const { data } = await db().from("rsvps").select("id,access_token").eq("access_token", token).maybeSingle();
    if (!data) return NextResponse.redirect(`${home}/?link=invalid`, 303);
    await db().from("rsvps").update({ last_opened_at: new Date().toISOString() }).eq("id", data.id);
    const res = NextResponse.redirect(`${home}/`, 303);
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("Cache-Control", "no-store");
    return setSessionCookie(res, data, true);
  } catch (e) {
    console.error("Personal link failed", e);
    return NextResponse.redirect(`${home}/?link=error`, 303);
  }
}
