// rsvp.lucysquinceanera.com/contact.vcf — the contact card guests save to their phone.
// Sent as an attachment with the welcome text (US/Canada) or opened from a link (Mexico).
// Phone number comes from SMS_CONTACT_PHONE; the photo is public/contact-photo.jpg.
export const runtime = "nodejs";
export const revalidate = 3600;

const NAME = "Lucy's Quinceañera";

// vCard lines longer than 75 characters are folded onto continuation lines that start with a space.
function fold(line) {
  const out = [];
  for (let i = 0; i < line.length; i += 74) out.push((i ? " " : "") + line.slice(i, i + 74));
  return out.join("\r\n");
}

const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

export async function GET(req) {
  const phone = String(process.env.SMS_CONTACT_PHONE || "").replace(/[^\d+]/g, "");
  if (!/^\+\d{10,15}$/.test(phone)) {
    return new Response("Contact card not set up yet: add SMS_CONTACT_PHONE (e.g. +13105551234) in Vercel.", { status: 503 });
  }
  const site = (process.env.PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/+$/, "");

  let photo = "";
  try {
    const res = await fetch(new URL("/contact-photo.jpg", req.url), { cache: "force-cache" });
    if (res.ok) photo = Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {}

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:;${esc(NAME)};;;`,
    `FN:${esc(NAME)}`,
    `ORG:${esc(NAME)}`,
    `TEL;TYPE=CELL,VOICE,pref:${phone}`,
    `URL:${site}`,
    `NOTE:${esc("Número oficial para la Quinceañera de Lucy · Official number for Lucy's Quinceañera · 4 enero / January 4 2027")}`,
    ...(photo ? [fold(`PHOTO;ENCODING=b;TYPE=JPEG:${photo}`)] : []),
    "END:VCARD",
  ];

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'inline; filename="Lucys-Quinceanera.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
