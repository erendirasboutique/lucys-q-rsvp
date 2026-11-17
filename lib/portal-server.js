// Server-only helpers for the personal guest pages.
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, cleanText } from "../app/api/_supabase";

export const COOKIE = "lq_guest";
export const EVENT_TZ = "America/Bahia_Banderas"; // Rincón de Guayabitos, Nayarit
export const BUCKET = "guest-uploads";

export const db = () => getSupabaseAdmin();
export { cleanText };

function secret() {
  const s = process.env.RSVP_TOKEN_SECRET;
  if (!s || s.length < 32) throw Error("Set RSVP_TOKEN_SECRET to a random secret at least 32 characters");
  return s;
}

export function sign(value) {
  return crypto.createHmac("sha256", secret()).update(String(value)).digest("base64url");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function newAccessToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Short fingerprint of the current private link. If the link is reset, old sessions stop working.
export function fingerprint(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex").slice(0, 16);
}

// ---------- Guest session cookie ----------
export function makeSession(rsvp, days = 30) {
  const payload = Buffer.from(JSON.stringify({ id: rsvp.id, fp: fingerprint(rsvp.access_token), exp: Date.now() + days * 864e5 })).toString("base64url");
  return `${payload}.${sign("session:" + payload)}`;
}

export function readSession(value) {
  try {
    const [payload, sig] = String(value || "").split(".");
    if (!payload || !sig || !safeEqual(sig, sign("session:" + payload))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.id || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, rsvp, remember = true) {
  res.cookies.set(COOKIE, makeSession(rsvp, 30), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: 30 * 86400 } : {}),
  });
  return res;
}

export function clearSessionCookie(res) {
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

// Returns the signed-in guest's full RSVP row, or null.
export async function currentGuest(req) {
  const session = readSession(req.cookies.get(COOKIE)?.value);
  if (!session) return null;
  const { data, error } = await db().from("rsvps").select("*").eq("id", session.id).maybeSingle();
  if (error || !data || !data.access_token) return null;
  if (fingerprint(data.access_token) !== session.fp) return null;
  return data;
}

export function unauthorized() {
  return NextResponse.json({ ok: false, error: "signed_out" }, { status: 401 });
}

export function fail(error, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function serverError(label, e) {
  console.error(label, e);
  return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
}

// ---------- Signed public codes ----------
export function tableCode(label) {
  const l = cleanText(label);
  return `${encodeURIComponent(l)}.${sign("table:" + l).slice(0, 16)}`;
}

export function readTableCode(code) {
  const raw = String(code || "");
  const i = raw.lastIndexOf(".");
  if (i < 1) return null;
  let label;
  try {
    label = decodeURIComponent(raw.slice(0, i));
  } catch {
    return null;
  }
  return safeEqual(raw.slice(i + 1), sign("table:" + label).slice(0, 16)) ? label : null;
}

export function djCode() {
  return sign("dj-list").slice(0, 24);
}

export function uploadTicket(path) {
  return sign("upload:" + path);
}

export function checkUploadTicket(path, ticket) {
  return Boolean(path) && Boolean(ticket) && safeEqual(ticket, uploadTicket(path));
}

// ---------- Settings & mode ----------
export async function getSettings() {
  const { data, error } = await db().from("portal_settings").select("key,value");
  if (error) throw error;
  const map = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  return {
    event: map.event || {},
    mode: map.mode || { tonight_date: "2027-01-04", after_date: "2027-01-06", force: "" },
    schedule: Array.isArray(map.schedule) ? map.schedule : [],
    linkText: map.link_text && map.link_text.es ? map.link_text : null,
    welcomeText: map.welcome_text && map.welcome_text.es ? map.welcome_text : null,
  };
}

export function todayAtEvent() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TZ }).format(new Date());
}

export function currentMode(mode) {
  if (["pre", "tonight", "after"].includes(mode?.force)) return mode.force;
  const today = todayAtEvent();
  if (mode?.after_date && today >= mode.after_date) return "after";
  if (mode?.tonight_date && today >= mode.tonight_date) return "tonight";
  return "pre";
}

// ---------- Who sees what ----------
export function isConfirmed(r) {
  const s = String(r?.attending || "").toLowerCase().trim();
  return /^(si|sí|yes)(\/|$|\s)/.test(s) || s === "si/yes";
}

export function audienceMatch(audience, rsvp) {
  const a = String(audience || "all");
  if (a === "all") return true;
  const [kind, ...rest] = a.split(":");
  const value = rest.join(":").trim().toLowerCase();
  if (kind === "tag") return (rsvp.guest_tags || []).map((t) => String(t).toLowerCase()).includes(value);
  if (kind === "hotel") return String(rsvp.hotel || "").toLowerCase() === value;
  if (kind === "table") return String(rsvp.table_number || "").toLowerCase() === value;
  if (kind === "confirmed") return isConfirmed(rsvp);
  return false;
}

export function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

export function siteUrl(req) {
  const env = process.env.PUBLIC_SITE_URL || process.env.SMS_PUBLIC_BASE_URL;
  if (env && /^https?:\/\//.test(env)) return env.replace(/\/+$/, "");
  const url = new URL(req.url);
  return url.origin;
}

export function personalLink(req, rsvp) {
  return `${siteUrl(req)}/g/${rsvp.access_token}`;
}

// ---------- Best-effort rate limiting (per server instance) ----------
const hits = new Map();
export function rateLimited(req, bucket, max, windowMs = 60_000) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

// ---------- Validation helpers ----------
export const clip = (v, n) => cleanText(v).slice(0, n);
export const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
export const isTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ""));
