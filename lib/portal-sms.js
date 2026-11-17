// Text messages for the guest pages (private links, announcements, replies).
// Uses the same Twilio setup and the same safety rules as the SMS tab:
// confirmed guests only, recorded SMS opt-in only, +1 / +52 numbers only, 25 per click,
// and a unique (campaign_key, phone) row in sms_outbox so nobody is texted twice.
import { client, phoneE164, safeError, segments } from "./lucy-sms";
import { db, isConfirmed } from "./portal-server";
import { renderLinkText, DEFAULT_LINK_TEXT, withPrefix, canGetMms, contactLinkLine } from "./link-text";

export function smsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_API_KEY &&
      process.env.TWILIO_API_KEY_SECRET &&
      process.env.TWILIO_MESSAGING_SERVICE_SID
  );
}

function saidNo(r) {
  const s = String(r?.attending || "").toLowerCase().trim();
  return !isConfirmed(r) && /^no\b/.test(s);
}

// allowPending: also text guests who haven't answered yet (but never someone who said No).
export function smsReason(r, { allowPending = false } = {}) {
  if (allowPending ? saidNo(r) : !isConfirmed(r)) return allowPending ? "Said they're not coming" : "Not confirmed";
  if (!r.sms_opt_in || !r.sms_opt_in_at) return "No recorded SMS opt-in";
  if (!phoneE164(r)) return "Phone needs +1 or +52";
  return null;
}

export function countryOf(rsvp) {
  const p = phoneE164(rsvp) || "";
  return p.startsWith("+52") ? "mx" : p.startsWith("+1") ? "us" : null;
}

const FAILED = ["needs_review", "failed", "undelivered"];

// Lets a send that failed before (for example Mexico numbers before Twilio allowed them) go out again.
// The old row stays in SMS history, renamed so it no longer blocks the new attempt.
export async function reopenFailed(campaignKeys) {
  if (!campaignKeys.length) return 0;
  const database = db();
  let reopened = 0;
  for (let i = 0; i < campaignKeys.length; i += 200) {
    const { data, error } = await database.from("sms_outbox").select("id,campaign_key,status").in("campaign_key", campaignKeys.slice(i, i + 200)).in("status", FAILED);
    if (error) throw error;
    for (const row of data || []) {
      const { error: e2 } = await database.from("sms_outbox").update({ campaign_key: `${row.campaign_key}-failed-${Date.now()}` }).eq("id", row.id);
      if (e2) throw e2;
      reopened++;
    }
  }
  return reopened;
}

// Asks Twilio what actually happened to texts we still think are on their way, and saves the answer.
// Catches texts Twilio accepted but couldn't deliver (e.g. Mexico before it was turned on).
const OPEN = ["reserved", "queued", "accepted", "scheduled", "sending", "sent"];
export async function syncStatuses(prefixes) {
  if (!smsConfigured()) return { checked: 0, failed: 0, delivered: 0 };
  const database = db();
  const tw = client();
  let checked = 0, failed = 0, delivered = 0;
  for (const prefix of prefixes) {
    const { data, error } = await database
      .from("sms_outbox")
      .select("id,campaign_key,status,twilio_sid")
      .like("campaign_key", `${prefix}-%`)
      .in("status", OPEN)
      .limit(300);
    if (error) throw error;
    for (const row of data || []) {
      if (!row.twilio_sid) continue;
      try {
        const m = await tw.messages(row.twilio_sid).fetch();
        checked++;
        if (m.status && m.status !== row.status) {
          await database
            .from("sms_outbox")
            .update({ status: m.status, error_message: m.errorCode ? `Twilio error ${m.errorCode}${m.errorMessage ? ": " + m.errorMessage : ""}` : null })
            .eq("id", row.id);
        }
        if (FAILED.includes(m.status)) failed++;
        if (m.status === "delivered") delivered++;
      } catch (e) {
        console.error("Twilio status check failed", safeError(e));
      }
    }
  }
  return { checked, failed, delivered };
}

function statusCallback() {
  const base = process.env.SMS_PUBLIC_BASE_URL;
  return base && /^https:\/\//.test(base) ? `${base.replace(/\/$/, "")}/api/sms/status` : undefined;
}

// items: [{ rsvp, campaignKey, message, mediaUrl?, contactUrl? }]
// mediaUrl is attached as a picture message (MMS) for US/Canada numbers. Other numbers can't get MMS,
// so they get the plain text plus a link (contactUrl) that opens the same contact card.
export async function sendBatch(items, limit = 25, { allowPending = false } = {}) {
  if (!smsConfigured()) throw Error("Texting is not set up yet (Twilio environment variables are missing).");
  const database = db();
  const tw = client();
  const seenPhones = new Set();
  let submitted = 0;
  let skipped = 0;
  let failed = 0;
  let attempted = 0;
  let mms = 0;
  const notes = [];
  for (const { rsvp, campaignKey, message: rawMessage, mediaUrl, contactUrl } of items) {
    if (attempted >= limit) break;
    const reason = smsReason(rsvp, { allowPending });
    if (reason) {
      skipped++;
      notes.push(`${rsvp.full_name}: ${reason}`);
      continue;
    }
    const phone = phoneE164(rsvp);
    const asMms = Boolean(mediaUrl) && canGetMms(phone);
    let message = withPrefix(rawMessage);
    if (mediaUrl && !asMms && contactUrl) message += contactLinkLine(rsvp, contactUrl);
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
        ...(asMms ? { mediaUrl: [mediaUrl] } : {}),
        ...(statusCallback() ? { statusCallback: statusCallback() } : {}),
      });
      if (asMms) mms++;
      await database.from("sms_outbox").update({ twilio_sid: sent.sid, status: sent.status || "queued", sent_at: new Date().toISOString() }).eq("id", reserved.id);
      submitted++;
    } catch (e) {
      await database.from("sms_outbox").update({ status: "needs_review", error_message: safeError(e) }).eq("id", reserved.id);
      failed++;
    }
  }
  return { submitted, skipped, failed, mms, notes: notes.slice(0, 20) };
}

export function linkMessage(rsvp, link, template) {
  return renderLinkText(template || DEFAULT_LINK_TEXT, rsvp, link);
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
