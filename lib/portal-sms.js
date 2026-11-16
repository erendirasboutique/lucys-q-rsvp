// Text messages for the guest pages (private links, announcements, replies).
// Uses the same Twilio setup and the same safety rules as the SMS tab:
// confirmed guests only, recorded SMS opt-in only, +1 / +52 numbers only, 25 per click,
// and a unique (campaign_key, phone) row in sms_outbox so nobody is texted twice.
import { client, phoneE164, safeError, segments } from "./lucy-sms";
import { db, isConfirmed, firstName } from "./portal-server";

export function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_API_KEY &&
      process.env.TWILIO_API_KEY_SECRET &&
      process.env.TWILIO_MESSAGING_SERVICE_SID
  );
}

export function smsReason(r) {
  if (!isConfirmed(r)) return "Not confirmed";
  if (!r.sms_opt_in || !r.sms_opt_in_at) return "No recorded SMS opt-in";
  if (!phoneE164(r)) return "Phone needs +1 or +52";
  return null;
}

function statusCallback() {
  const base = process.env.SMS_PUBLIC_BASE_URL;
  return base && /^https:\/\//.test(base) ? `${base.replace(/\/$/, "")}/api/sms/status` : undefined;
}

// items: [{ rsvp, campaignKey, message }]
export async function sendBatch(items, limit = 25) {
  if (!smsConfigured()) throw Error("Texting is not set up yet (Twilio environment variables are missing).");
  const database = db();
  const tw = client();
  const seenPhones = new Set();
  let submitted = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;
  const notes = [];
  for (const { rsvp, campaignKey, message } of items) {
    if (attempted >= limit) break;
    const reason = smsReason(rsvp);
    if (reason) {
      skipped++;
      notes.push(`${rsvp.full_name}: ${reason}`);
      continue;
    }
    const phone = phoneE164(rsvp);
    if (seenPhones.has(phone)) {
      skipped++;
      continue;
    }
    seenPhones.add(phone);
    const { data: reserved, error } = await database
      .from("sms_outbox")
      .insert({ campaign_key: campaignKey, rsvp_id: rsvp.id, phone, message, status: "reserved" })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        skipped++;
        continue;
      }
      throw error;
    }
    attempted++;
    try {
      const sent = await tw.messages.create({
        to: phone,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
        body: message,
        ...(statusCallback() ? { statusCallback: statusCallback() } : {}),
      });
      await database.from("sms_outbox").update({ twilio_sid: sent.sid, status: sent.status || "queued", sent_at: new Date().toISOString() }).eq("id", reserved.id);
      submitted++;
    } catch (e) {
      await database.from("sms_outbox").update({ status: "needs_review", error_message: safeError(e) }).eq("id", reserved.id);
      failed++;
    }
  }
  return { submitted, skipped, failed, notes: notes.slice(0, 20) };
}

export function linkMessage(rsvp, link) {
  return `Hola ${firstName(rsvp.full_name) || "invitado"}! Tu página personal para la Quinceañera de Lucy (mesa, viaje y mensajes): ${link} — Es solo para ti, por favor no la compartas.`;
}

export function messageCost(message) {
  return segments(message).segments;
}

// Optional: text the family when a guest writes in. Set FAMILY_NOTIFY_PHONE (e.g. +13105551234).
export async function notifyFamily(text) {
  const to = process.env.FAMILY_NOTIFY_PHONE;
  if (!to || !/^\+\d{10,15}$/.test(to) || !smsConfigured()) return;
  try {
    await client().messages.create({ to, messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID, body: text.slice(0, 320) });
  } catch (e) {
    console.error("Family notification failed", safeError(e));
  }
}
