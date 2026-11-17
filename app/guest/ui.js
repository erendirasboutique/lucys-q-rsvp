"use client";
// Small shared pieces for the guest page: icons, QR code, API + upload helpers.
import { qrSvgPath } from "../../lib/qr";

const PATHS = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  msg: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  check: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>,
  tick: <path d="M20 6 9 17l-5-5" />,
  cal: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  pin: <><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></>,
  mega: <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  crown: <path d="M2 18h20M3 7l5 4 4-7 4 7 5-4-2 11H5z" />,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></>,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  music: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></>,
  video: <><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" /></>,
  wallet: <><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>,
  back: <path d="m15 18-6-6 6-6" />,
  shirt: <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  send: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></>,
  bus: <><path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" /><circle cx="7" cy="18" r="2" /><path d="M9 18h5" /><circle cx="16" cy="18" r="2" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  sms: <><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></>,
  plate: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /></>,
  party: <><path d="M5.8 11.3 2 22l10.7-3.79" /><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01" /><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" /></>,
  chev: <path d="m9 18 6-6-6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  contact: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M15 8h2M15 12h2M7 16h6" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  printer: <><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
  table: <><circle cx="12" cy="12" r="5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  out: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

export function Icon({ name, size = 22, color = "currentColor", className = "" }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flex: "none" }}>
      {PATHS[name]}
    </svg>
  );
}

export function QR({ text, size = 120, label }) {
  if (!text) return null;
  const { size: n, path } = qrSvgPath(text);
  return (
    <svg role="img" aria-label={label || "QR code"} width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" style={{ background: "#fff", borderRadius: 10, flex: "none" }}>
      <path d={path} fill="#30272c" />
    </svg>
  );
}

export async function api(url, body) {
  const res = await fetch(url, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = {};
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || !data.ok) {
    const err = new Error(data.error || "error");
    err.status = res.status;
    throw err;
  }
  return data;
}

// Upload one file straight to Supabase Storage with a one-time signed URL from our server.
export async function uploadFile(file, { kind, tableCode } = {}) {
  const type = file.type || (/\.(mov)$/i.test(file.name) ? "video/quicktime" : /\.(mp4)$/i.test(file.name) ? "video/mp4" : "image/jpeg");
  const ticket = await api("/api/guest/upload", { kind, contentType: type, tableCode });
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", file);
  const res = await fetch(ticket.signedUrl, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
  if (!res.ok) throw new Error("upload_failed");
  return { path: ticket.path, ticket: ticket.ticket, contentType: type };
}

// Turns a city the guest typed into a likely home airport code (only used for the flight search link).
const AIRPORTS = [
  [/los angeles|\bla\b|l\.a\.|hollywood|long beach|pasadena|santa monica|downey|whittier|el monte|pomona/i, "LAX"],
  [/orange county|santa ana|anaheim|irvine/i, "SNA"], [/ontario|riverside|san bernardino|inland empire|fontana/i, "ONT"],
  [/san diego|chula vista/i, "SAN"], [/tijuana/i, "TIJ"], [/san francisco/i, "SFO"], [/oakland|hayward/i, "OAK"],
  [/san jos[eé]|santa clara/i, "SJC"], [/sacramento/i, "SMF"], [/fresno/i, "FAT"], [/bakersfield/i, "LAX"],
  [/phoenix|mesa|tempe|glendale|scottsdale/i, "PHX"], [/tucson/i, "TUS"], [/las vegas/i, "LAS"], [/denver/i, "DEN"],
  [/seattle|tacoma/i, "SEA"], [/portland/i, "PDX"], [/salt lake/i, "SLC"], [/dallas|fort worth|arlington/i, "DFW"],
  [/houston/i, "IAH"], [/austin/i, "AUS"], [/san antonio/i, "SAT"], [/el paso|ju[aá]rez/i, "ELP"], [/chicago/i, "ORD"],
  [/atlanta/i, "ATL"], [/new york|nyc|brooklyn|queens|bronx|new jersey/i, "JFK"], [/miami/i, "MIA"], [/minneapolis/i, "MSP"],
  [/guadalajara|zapopan|tlaquepaque/i, "GDL"], [/ciudad de m[eé]xico|mexico city|cdmx/i, "MEX"], [/monterrey/i, "MTY"],
  [/tepic/i, "TPQ"], [/le[oó]n|guanajuato/i, "BJX"], [/morelia/i, "MLM"], [/quer[eé]taro/i, "QRO"],
];
export function airportFor(city) {
  const c = String(city || "");
  const exact = /\b([A-Z]{3})\b/.exec(c);
  for (const [re, code] of AIRPORTS) if (re.test(c)) return code;
  return exact ? exact[1] : null;
}
