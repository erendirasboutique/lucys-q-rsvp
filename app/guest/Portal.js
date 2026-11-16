"use client";
// The signed-in guest page: Home, Travel, Messages, RSVP tabs plus role and pass views.
import { useEffect, useMemo, useState } from "react";
import { T, fmtTime, fmtDate } from "./i18n";
import { Icon, QR, api, uploadFile, airportFor } from "./ui";
import { hotels as HOTELS } from "../data";

const EVENT_TZ = "America/Bahia_Banderas";

export function isYes(v) {
  const s = String(v || "").toLowerCase();
  return s.includes("si") || s.includes("sí") || s.includes("yes");
}
export function isNo(v) {
  return !isYes(v) && String(v || "").toLowerCase().includes("no");
}

function partyNames(g) {
  const extra = `${g.additional_guests || ""}\n${g.confirmed_guests || ""}`
    .split(/\n|,|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  return [g.full_name, ...extra].filter((n) => {
    const k = String(n || "").toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const initials = (n) => String(n || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();

function nowAtEvent() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: EVENT_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return parts.replace(/^24/, "00");
}

function daysUntil(date) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TZ }).format(new Date());
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 864e5));
}

export default function Portal({ data, lang, setLang, reload, onSignOut }) {
  const t = T[lang];
  const g = data.guest;
  const [tab, setTab] = useState("home");
  const [view, setView] = useState(null); // 'role' | 'pass'
  const [msgSub, setMsgSub] = useState("family");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, view, msgSub]);

  // Refresh every minute on the day of the party so "Now / Next" and announcements stay current.
  useEffect(() => {
    if (data.mode !== "tonight") return;
    const id = setInterval(reload, 60_000);
    return () => clearInterval(id);
  }, [data.mode, reload]);

  async function save(section, payload, okText) {
    try {
      await api("/api/guest/update", { section, data: payload });
      setToast(okText || t.saved);
      await reload();
      return true;
    } catch (e) {
      if (e.status === 401) return onSignOut();
      setToast(e.message === "not_enough_seats" ? t.notEnoughSeats : e.message && e.message !== "error" ? e.message : t.error);
      return false;
    }
  }

  const go = (nextTab, sub) => {
    setView(null);
    setTab(nextTab);
    if (sub) setMsgSub(sub);
  };

  const unread = (data.messages || []).filter((m) => m.sender === "family" && !m.read_by_guest_at).length;
  const ctx = { data, g, t, lang, save, go, setView, setToast, reload, onSignOut };

  return (
    <div className="gp">
      <header className="gp-top">
        <img src="/logo.png" alt="Lucy's Quinceañera" className="gp-logo" />
        <div className="gp-row" style={{ gap: 8 }}>
          <div className="gp-seg small" role="group" aria-label={t.language}>
            {["es", "en"].map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => { setLang(l); api("/api/guest/update", { section: "language", data: { lang: l } }).catch(() => {}); }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="gp-iconbtn" aria-label={t.signOut} title={t.signOut} onClick={onSignOut}>
            <Icon name="out" size={20} />
          </button>
        </div>
      </header>

      <main className="gp-wrap">
        {view === "role" && <RoleView {...ctx} />}
        {view === "pass" && <PassView {...ctx} />}
        {!view && tab === "home" && (data.mode === "tonight" ? <HomeTonight {...ctx} /> : data.mode === "after" ? <HomeAfter {...ctx} /> : <HomePre {...ctx} />)}
        {!view && tab === "travel" && <Travel {...ctx} />}
        {!view && tab === "messages" && <Messages {...ctx} sub={msgSub} setSub={setMsgSub} />}
        {!view && tab === "rsvp" && <Rsvp {...ctx} />}
        <p className="gp-footer">{t.footer}</p>
      </main>

      {toast && <div className="gp-toast" role="status">{toast}</div>}

      <nav className="gp-tabbar" aria-label="Guest page">
        {[
          ["home", t.tabHome, "home"],
          ["travel", t.tabTravel, "plane"],
          ["messages", t.tabMessages, "msg"],
          ["rsvp", t.tabRsvp, "check"],
        ].map(([id, label, icon]) => (
          <button key={id} type="button" className="gp-tab" aria-current={!view && tab === id ? "page" : undefined} onClick={() => go(id)}>
            <span className="gp-tabicon">
              <Icon name={icon} />
              {id === "messages" && unread > 0 && <span className="gp-dot" aria-hidden="true">{unread}</span>}
            </span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ---------------- Home: before the party ---------------- */
function Announcements({ data, t }) {
  if (!data.announcements?.length) return null;
  const a = data.announcements[0];
  return (
    <section className="gp-banner" aria-label="Announcement">
      <Icon name="mega" color="#fff" />
      <div>
        <span className="gp-banner-meta">{t.fromFamily} · {new Date(a.created_at).toLocaleDateString()}</span>
        <p>{a.body}</p>
        {data.announcements.length > 1 && (
          <details>
            <summary>+{data.announcements.length - 1}</summary>
            {data.announcements.slice(1).map((x) => <p key={x.id} className="gp-banner-old">{x.body}</p>)}
          </details>
        )}
      </div>
    </section>
  );
}

function StatusPills({ g, t }) {
  const yes = isYes(g.attending);
  const no = isNo(g.attending);
  return (
    <div className="gp-row wrap" style={{ gap: 8 }}>
      <span className={`gp-pill ${yes ? "ok" : no ? "muted" : "warn"}`}>
        {yes && <Icon name="tick" size={14} />} {yes ? t.confirmed : no ? t.notAttending : t.pending}
      </span>
      <span className="gp-pill">{t.guestsN(Number(g.guest_count || 1))}</span>
    </div>
  );
}

function TableCard({ g, t }) {
  return (
    <section className="gp-card hl gp-row" style={{ gap: 18 }}>
      <div className="gp-table-circle">
        <span>{t.mesa}</span>
        <strong>{g.table_number || "—"}</strong>
      </div>
      <div className="gp-col" style={{ gap: 6 }}>
        <h2 className="gp-h2">{t.yourTable}</h2>
        <p className="gp-muted">{g.table_number ? g.table_note || "" : t.tableTbd}</p>
      </div>
    </section>
  );
}

function CheckinCard({ g, t, setView }) {
  if (!g.checkin_code) return null;
  return (
    <section className="gp-dark gp-row" style={{ gap: 16 }}>
      <QR text={g.checkin_code} size={96} label={t.checkinCode} />
      <div className="gp-col" style={{ gap: 4 }}>
        <span className="gp-eyebrow light">{t.checkinCode}</span>
        <strong className="gp-code">{g.checkin_code}</strong>
        <span className="gp-small light">{t.checkinHelp}</span>
        <button type="button" className="gp-link light" onClick={() => setView("pass")}>{t.showPass}</button>
      </div>
    </section>
  );
}

function EventsCard({ data, t, lang, save, setView }) {
  const events = data.events || [];
  return (
    <section className="gp-card">
      <span className="gp-eyebrow">{t.weekend}</span>
      <h2 className="gp-h2">{t.invitedTo}</h2>
      {events.length > 0 && (
        <ul className="gp-events">
          {events.map((e) => (
            <li key={e.id}>
              <div className="gp-col">
                <strong className="gp-serif">{fmtDate(e.event_date, lang, { weekday: "short", day: "numeric" })}</strong>
                <span className="gp-small gp-muted">{e.event_time ? fmtTime(e.event_time, lang) : ""}</span>
              </div>
              <div className="gp-col" style={{ gap: 4 }}>
                <strong>{lang === "en" ? e.title_en || e.title_es : e.title_es}</strong>
                {e.location && (e.maps_url ? <a href={e.maps_url} target="_blank" rel="noopener noreferrer" className="gp-small">{e.location}</a> : <span className="gp-small gp-muted">{e.location}</span>)}
                {e.audience !== "all" && <span className="gp-pill pink" style={{ alignSelf: "flex-start" }}>{lang === "es" ? "Invitación especial" : "Special invite"}</span>}
                {e.ask_rsvp && (
                  <div className="gp-seg small" role="group" aria-label={t.areYouGoing} style={{ alignSelf: "flex-start", marginTop: 4 }}>
                    <button type="button" aria-pressed={e.going === true} onClick={() => save("event", { event_id: e.id, going: true })}>{t.going}</button>
                    <button type="button" aria-pressed={e.going === false} onClick={() => save("event", { event_id: e.id, going: false })}>{t.notGoing}</button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="gp-grid2">
        <a className="gp-btn outline small" href={`/api/guest/calendar?lang=${lang}`}><Icon name="cal" size={18} />{t.addCalendar}</a>
        <button type="button" className="gp-btn outline small" onClick={() => setView("pass")}><Icon name="wallet" size={18} />{t.savePass}</button>
      </div>
    </section>
  );
}

function Schedule({ data, t, lang, highlight }) {
  if (!data.schedule?.length) return null;
  return (
    <section className="gp-card">
      <h2 className="gp-h2">{t.nightOf}</h2>
      <dl className="gp-schedule">
        {data.schedule.map((s, i) => (
          <div key={i} className={highlight === i ? "on" : ""}>
            <dt>{fmtTime(s.time, lang)}</dt>
            <dd>{s[lang] || s.es}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HomePre(ctx) {
  const { data, g, t, lang, go, setView } = ctx;
  const names = partyNames(g);
  const days = daysUntil(data.eventDate);

  return (
    <div className="gp-stack">
      <Announcements {...ctx} />
      <section className="gp-col" style={{ gap: 8 }}>
        <h1 className="gp-h1">{t.hola}, {g.first_name}</h1>
        <p className="gp-muted">{isYes(g.attending) ? t.happy : isNo(g.attending) ? t.sorry : t.pendingNote}</p>
        <StatusPills g={g} t={t} />
      </section>

      <section className="gp-countdown" aria-label="Countdown">
        <div><strong className="pink">{days}</strong><span>{t.daysToGo}</span></div>
        <div><strong>{fmtDate(data.eventDate, lang, { month: "short", day: "numeric" })}</strong><span>{data.eventDate?.slice(0, 4)}</span></div>
        <div><strong>{fmtTime(data.schedule?.[0]?.time || "16:30", lang)}</strong><span>{t.doorsOpen}</span></div>
      </section>

      {g.personal_note && (
        <section className="gp-card soft">
          <span className="gp-eyebrow">{t.personalNote}</span>
          <p className="gp-p">{g.personal_note}</p>
        </section>
      )}

      {g.role_title && (
        <button type="button" className="gp-role" onClick={() => setView("role")}>
          <span className="gp-role-icon"><Icon name="crown" size={26} color="#b8005f" /></span>
          <span className="gp-col" style={{ gap: 2, textAlign: "left" }}>
            <span className="gp-eyebrow">{t.yourRole}</span>
            <strong className="gp-serif" style={{ fontSize: 22 }}>{g.role_title}</strong>
            <span className="gp-small gp-muted">{g.role_moment ? `${g.role_moment} — ` : ""}{t.seeYourPart}</span>
          </span>
        </button>
      )}

      {isYes(g.attending) && <TableCard g={g} t={t} />}

      <section className="gp-card">
        <div className="gp-row between">
          <h2 className="gp-h2">{t.yourParty}</h2>
          <button type="button" className="gp-link" onClick={() => go("rsvp")}>{t.edit}</button>
        </div>
        <ul className="gp-party">
          {names.map((n) => <li key={n}><span aria-hidden="true">{initials(n)}</span>{n}</li>)}
        </ul>
      </section>

      {isYes(g.attending) && <CheckinCard {...ctx} />}

      <EventsCard {...ctx} />

      <section className="gp-tiles" aria-label="Quick links">
        <button type="button" className="gp-tile" onClick={() => go("messages", "wish")}><Icon name="heart" color="#b8005f" /><strong>{t.wish}</strong><span>{t.wishSub}</span></button>
        <button type="button" className="gp-tile" onClick={() => go("messages", "songs")}><Icon name="music" color="#b8005f" /><strong>{t.songs}</strong><span>{t.songsSub}</span></button>
        <button type="button" className="gp-tile" onClick={() => go("travel")}><Icon name="plane" color="#b8005f" /><strong>{t.arrival}</strong><span>{g.flight_number || t.arrivalSub}</span></button>
        <button type="button" className="gp-tile" onClick={() => { go("rsvp"); setTimeout(() => document.getElementById("gp-meals")?.scrollIntoView({ behavior: "smooth" }), 50); }}><Icon name="shirt" color="#b8005f" /><strong>{t.meals}</strong><span>{t.mealsSub}</span></button>
        {data.event?.gifts_url && (
          <a className="gp-tile" href={data.event.gifts_url} target="_blank" rel="noopener noreferrer"><Icon name="gift" color="#b8005f" /><strong>{t.gifts}</strong><span>{(lang === "en" ? data.event.gifts_note_en : data.event.gifts_note_es) || t.giftsSub}</span></a>
        )}
      </section>

      <Schedule {...ctx} />
    </div>
  );
}

/* ---------------- Home: the day of the party ---------------- */
function HomeTonight(ctx) {
  const { data, g, t, lang, go, setView } = ctx;
  const [clock, setClock] = useState(nowAtEvent());
  useEffect(() => {
    const id = setInterval(() => setClock(nowAtEvent()), 30_000);
    return () => clearInterval(id);
  }, []);
  const items = data.schedule || [];
  let nowIdx = -1;
  items.forEach((s, i) => {
    if (s.time <= clock) nowIdx = i;
  });
  const now = items[nowIdx];
  const upcoming = items.slice(nowIdx + 1, nowIdx + 3);
  const meals = Array.isArray(g.meals) ? g.meals : [];
  const kids = meals.filter((m) => m.kid).map((m) => m.name.split(" ")[0]);

  return (
    <div className="gp-stack">
      <span className="gp-pill dark" style={{ alignSelf: "flex-start" }}>{t.tonight}</span>
      <Announcements {...ctx} />
      {g.checked_in ? (
        <section className="gp-okbar"><Icon name="check" size={26} /><div className="gp-col"><strong>{t.checkedIn}</strong>{g.checked_in_at && <span className="gp-small">{t.arrivedAt(new Date(g.checked_in_at).toLocaleTimeString(lang === "es" ? "es-MX" : "en-US", { hour: "numeric", minute: "2-digit", timeZone: EVENT_TZ }))}</span>}</div></section>
      ) : (
        <CheckinCard {...ctx} />
      )}

      <section className="gp-card hl">
        {now ? (
          <div className="gp-col" style={{ gap: 4 }}>
            <span className="gp-eyebrow pink">{t.now} · {fmtTime(now.time, lang)}</span>
            <strong className="gp-now">{now[lang] || now.es}</strong>
          </div>
        ) : (
          <div className="gp-col" style={{ gap: 4 }}>
            <span className="gp-eyebrow pink">{t.hola}, {g.first_name}</span>
            <strong className="gp-now">{t.happy}</strong>
          </div>
        )}
        {upcoming.map((s, i) => (
          <div key={s.time} className="gp-row between gp-divider">
            <span className="gp-eyebrow">{i === 0 ? t.next : t.then} · {fmtTime(s.time, lang)}</span>
            <strong>{s[lang] || s.es}</strong>
          </div>
        ))}
        {g.role_moment && (
          <button type="button" className="gp-row between gp-divider gp-plain pink" onClick={() => setView("role")}>
            <span className="gp-eyebrow pink">{t.yourMomentShort}</span>
            <strong>{g.role_moment}</strong>
          </button>
        )}
      </section>

      <section className="gp-grid2">
        <div className="gp-card tight">
          <span className="gp-eyebrow">{t.yourTable}</span>
          <strong className="gp-big pink">{g.table_number || "—"}</strong>
          {g.table_note && <span className="gp-small gp-muted">{g.table_note}</span>}
        </div>
        {kids.length > 0 && (
          <div className="gp-card tight">
            <span className="gp-eyebrow">{t.kidsTable}</span>
            <strong className="gp-big pink">K</strong>
            <span className="gp-small gp-muted">{kids.join(", ")}</span>
          </div>
        )}
      </section>

      {data.photoCode && (
        <a className="gp-dark gp-row" style={{ gap: 14, textDecoration: "none" }} href={`/photos/${data.photoCode}`}>
          <Icon name="camera" size={28} color="#fff" />
          <span className="gp-col"><strong style={{ fontSize: 17 }}>{t.sharePhotos}</strong><span className="gp-small light">{t.sharePhotosSub}</span></span>
        </a>
      )}

      <div className="gp-grid2">
        <button type="button" className="gp-btn outline small" onClick={() => go("messages", "songs")}><Icon name="music" size={18} />{t.songs}</button>
        <button type="button" className="gp-btn outline small" onClick={() => go("messages", "wish")}><Icon name="heart" size={18} />{t.wish}</button>
      </div>
      <Schedule {...ctx} highlight={nowIdx} />
    </div>
  );
}

/* ---------------- Home: after the party ---------------- */
function HomeAfter(ctx) {
  const { data, g, t, lang } = ctx;
  const [photos, setPhotos] = useState(null);
  useEffect(() => {
    api("/api/photos", { action: "list" }).then((d) => setPhotos(d.photos)).catch(() => setPhotos([]));
  }, []);
  const note = lang === "en" ? data.event?.thank_you_en || data.event?.thank_you_es : data.event?.thank_you_es;
  return (
    <div className="gp-stack">
      <section className="gp-card hl" style={{ textAlign: "center", alignItems: "center" }}>
        <h1 className="gp-h1">{t.gracias}, {g.first_name}</h1>
        {note && <p className="gp-serif" style={{ fontSize: 17, lineHeight: 1.55, whiteSpace: "pre-line", margin: 0 }}>{note}</p>}
        <span className="gp-serif pink" style={{ fontSize: 18 }}>— Lucy</span>
      </section>
      <section className="gp-card">
        <span className="gp-eyebrow">{t.album}</span>
        {photos === null ? <p className="gp-muted">{t.loading}</p> : photos.length === 0 ? <p className="gp-muted">{t.photosSoon}</p> : (
          <div className="gp-photos">
            {photos.slice(0, 9).map((p) => p.video ? <video key={p.url} src={p.url} muted playsInline preload="metadata" /> : <img key={p.url} src={p.url} alt="" loading="lazy" />)}
          </div>
        )}
        {data.photoCode && <a className="gp-btn" href={`/photos/${data.photoCode}`}>{t.seeAlbum}</a>}
      </section>
      {data.wishes?.length > 0 && (
        <section className="gp-card gp-row" style={{ gap: 12 }}>
          <Icon name="heart" color="#b8005f" />
          <div className="gp-col"><strong>{t.wishRead}</strong><span className="gp-small gp-muted">{t.thanksBeing}</span></div>
        </section>
      )}
    </div>
  );
}

/* ---------------- Role ---------------- */
function RoleView({ data, g, t, lang, save, setView, go }) {
  const special = (data.events || []).filter((e) => e.audience !== "all");
  const steps = String(g.role_details || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const color = data.event?.court_color;
  return (
    <div className="gp-stack">
      <button type="button" className="gp-back" onClick={() => setView(null)}><Icon name="back" size={18} />{t.back}</button>
      <header className="gp-col" style={{ gap: 6 }}>
        <span className="gp-eyebrow">{t.yourRole}</span>
        <h1 className="gp-h1">{g.role_title}</h1>
      </header>
      <section className="gp-card">
        <span className="gp-eyebrow">{t.whenToBeThere}</span>
        {special.map((e) => (
          <div key={e.id} className="gp-iconrow">
            <Icon name="cal" size={20} color="#b8005f" />
            <div className="gp-col">
              <strong>{lang === "en" ? e.title_en || e.title_es : e.title_es} · {fmtDate(e.event_date, lang)}{e.event_time ? ` · ${fmtTime(e.event_time, lang)}` : ""}</strong>
              {e.location && <span className="gp-muted">{e.location}</span>}
            </div>
          </div>
        ))}
        {g.role_moment && (
          <div className="gp-iconrow"><Icon name="clock" size={20} color="#b8005f" /><div className="gp-col"><strong>{t.yourMoment}</strong><span className="gp-muted">{g.role_moment}</span></div></div>
        )}
        <label className={`gp-confirm ${g.rehearsal_confirmed ? "on" : ""}`}>
          <input type="checkbox" checked={Boolean(g.rehearsal_confirmed)} onChange={(e) => save("rehearsal", { confirmed: e.target.checked })} />
          {t.rehearsalConfirm}
        </label>
      </section>
      <section className="gp-card">
        <span className="gp-eyebrow">{t.whatToWear}</span>
        <div className="gp-iconrow"><Icon name="shirt" size={20} color="#b8005f" /><div className="gp-col"><strong>{(lang === "en" ? data.event?.dress_code_en : data.event?.dress_code_es) || "Formal"}</strong>{color && <span className="gp-muted">{t.courtColor(color)}</span>}</div></div>
      </section>
      {steps.length > 0 && (
        <section className="gp-card">
          <span className="gp-eyebrow">{t.yourPart}</span>
          <ol className="gp-steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </section>
      )}
      <button type="button" className="gp-btn outline" onClick={() => go("messages", "family")}><Icon name="msg" size={18} />{t.askFamily}</button>
    </div>
  );
}

/* ---------------- Check-in pass ---------------- */
function PassView({ data, g, t, lang, setView }) {
  return (
    <div className="gp-stack">
      <button type="button" className="gp-back" onClick={() => setView(null)}><Icon name="back" size={18} />{t.back}</button>
      <article className="gp-pass">
        <img src="/logo.png" alt="Lucy's Quinceañera" />
        <span className="gp-eyebrow">{t.passTitle}</span>
        <h1 className="gp-h1" style={{ textAlign: "center" }}>{g.full_name}</h1>
        {g.checkin_code ? <QR text={g.checkin_code} size={220} label={t.checkinCode} /> : null}
        <strong className="gp-code dark">{g.checkin_code || "—"}</strong>
        <div className="gp-passgrid">
          <div><span>{t.mesa}</span><strong>{g.table_number || "—"}</strong></div>
          <div><span>{lang === "es" ? "Invitados" : "Guests"}</span><strong>{g.guest_count || 1}</strong></div>
        </div>
        <small className="gp-muted">{fmtDate(data.eventDate, lang, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · Rincón de Guayabitos</small>
      </article>
      <p className="gp-small gp-muted" style={{ textAlign: "center" }}>{t.passHelp}</p>
      <button type="button" className="gp-btn outline" onClick={() => window.print()}>{t.print}</button>
    </div>
  );
}

/* ---------------- Travel ---------------- */
const CHECK_KEYS = ["passports", "flights", "hotel", "pesos", "bank", "phone", "outfits", "sunscreen"];

function Travel({ data, g, t, lang, save, go }) {
  const code = airportFor(g.travel_from);
  const hotelNames = HOTELS.map((h) => h[0]).filter((n) => !/airbnb/i.test(n));
  const [flight, setFlight] = useState({
    flight_number: g.flight_number || "",
    landing_date: g.landing_date || "",
    landing_time: g.landing_time || "",
    ride_share_ok: Boolean(g.ride_share_ok),
  });
  const knownHotel = hotelNames.includes(g.hotel) ? g.hotel : g.hotel ? "__other" : "";
  const [stay, setStay] = useState({ choice: knownHotel, other: knownHotel === "__other" ? g.hotel : "", arrive_date: g.arrive_date || "", depart_date: g.depart_date || "" });
  const [from, setFrom] = useState(g.travel_from || "");
  const [editFrom, setEditFrom] = useState(!g.travel_from);
  const checklist = g.checklist || {};
  const party = Number(g.guest_count || 1);

  const travelPayload = (extra = {}) => ({
    ...flight,
    hotel: stay.choice === "__other" ? stay.other : stay.choice,
    arrive_date: stay.arrive_date,
    depart_date: stay.depart_date,
    travel_from: from,
    ...extra,
  });
  const flightsUrl = `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights ${code ? "from " + code + " " : ""}to PVR on 2027-01-02`)}`;

  return (
    <div className="gp-stack">
      <header className="gp-col" style={{ gap: 6 }}>
        <h1 className="gp-h1">{t.yourTravel}</h1>
        {editFrom ? (
          <form className="gp-row" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); save("travel", travelPayload()); setEditFrom(false); }}>
            <label className="sr-only" htmlFor="gp-from">{t.travelFrom}</label>
            <input id="gp-from" className="gp-input" value={from} placeholder={t.travelFrom} onChange={(e) => setFrom(e.target.value)} />
            <button className="gp-btn small" type="submit">{t.saveStay}</button>
          </form>
        ) : (
          <p className="gp-muted">{t.travelingFrom} <strong className="gp-ink">{g.travel_from}</strong> · <button type="button" className="gp-link" onClick={() => setEditFrom(true)}>{t.change}</button></p>
        )}
      </header>

      <section className="gp-card hl">
        <span className="gp-eyebrow">{t.whereToFly}</span>
        <div className="gp-route">
          <div className="gp-col"><strong>{code || "—"}</strong><span>{g.travel_from || ""}</span></div>
          <div className="gp-route-line" aria-hidden="true"><span /><Icon name="plane" color="#b8005f" className="gp-rot45" /><span /></div>
          <div className="gp-col" style={{ alignItems: "flex-end" }}><strong className="pink">PVR</strong><span>Puerto Vallarta</span></div>
        </div>
        <p className="gp-p">{t.flyInto}</p>
        <div className="gp-note"><Icon name="cal" size={18} color="#b8005f" /><p>{t.landTip}</p></div>
        <a className="gp-btn outline" href={flightsUrl} target="_blank" rel="noopener noreferrer">{t.searchFlights}{code ? ` ${code} → PVR` : ""}</a>
      </section>

      <section className="gp-card">
        <span className="gp-eyebrow">{t.yourFlight}</span>
        <form className="gp-col" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); save("travel", travelPayload()); }}>
          <div className="gp-field"><label htmlFor="gp-fl">{t.flightNumber}</label><input id="gp-fl" className="gp-input" value={flight.flight_number} placeholder="AS 1290" onChange={(e) => setFlight({ ...flight, flight_number: e.target.value })} /></div>
          <div className="gp-grid2">
            <div className="gp-field"><label htmlFor="gp-ld">{t.landingDate}</label><input id="gp-ld" type="date" className="gp-input" value={flight.landing_date} min="2026-12-01" max="2027-01-31" onChange={(e) => setFlight({ ...flight, landing_date: e.target.value })} /></div>
            <div className="gp-field"><label htmlFor="gp-lt">{t.landingTime}</label><input id="gp-lt" type="time" className="gp-input" value={flight.landing_time} onChange={(e) => setFlight({ ...flight, landing_time: e.target.value })} /></div>
          </div>
          <label className="gp-check"><input type="checkbox" checked={flight.ride_share_ok} onChange={(e) => setFlight({ ...flight, ride_share_ok: e.target.checked })} />{t.rideShareOk}</label>
          <button className="gp-btn" type="submit">{t.saveFlight}</button>
        </form>
      </section>

      {data.rideMatches?.length > 0 && (
        <section className="gp-card hl outlined">
          <span className="gp-eyebrow">{t.rideTogether}</span>
          <ul className="gp-list">{data.rideMatches.map((m, i) => <li key={i}><Icon name="users" size={18} color="#b8005f" />{t.rideMatch(m)}</li>)}</ul>
          <p className="gp-muted gp-small">{t.rideMatchHelp}</p>
          <button type="button" className="gp-btn small" onClick={() => go("messages", "family")}>{t.askFamily}</button>
        </section>
      )}

      {data.shuttles?.length > 0 && (
        <section className="gp-card">
          <span className="gp-eyebrow">{t.familyShuttle}</span>
          {data.shuttles.map((s) => {
            const mine = g.shuttle_id === s.id;
            const left = Number(s.seats || 0) - Number(s.seats_taken || 0) + (mine ? party : 0);
            return (
              <div key={s.id} className={`gp-shuttle ${mine ? "on" : ""}`}>
                <div className="gp-iconrow">
                  <Icon name="bus" size={20} color="#b8005f" />
                  <div className="gp-col">
                    <strong>{s.label}{s.depart_date ? ` · ${fmtDate(s.depart_date, lang)}` : ""}{s.depart_time ? ` · ${fmtTime(s.depart_time, lang)}` : ""}</strong>
                    <span className="gp-muted">{[s.from_place, s.to_place].filter(Boolean).join(" → ")}{s.notes ? ` · ${s.notes}` : ""}</span>
                    <span className="gp-small gp-muted">{mine ? t.yourSeats : left >= party ? t.seatsLeft(left - (mine ? party : 0)) : t.full}</span>
                  </div>
                </div>
                {mine ? (
                  <button type="button" className="gp-btn outline small" onClick={() => save("shuttle", { shuttle_id: null })}>{t.cancelSeats}</button>
                ) : (
                  <button type="button" className="gp-btn outline small" disabled={left < party} onClick={() => save("shuttle", { shuttle_id: s.id })}>{t.saveSeats(party)}</button>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="gp-card">
        <span className="gp-eyebrow">{t.airportTo}</span>
        <h2 className="gp-h2">{t.driveTime}</h2>
        <div className="gp-best"><span className="gp-pill solid">{t.bestForYou}</span><p>{party >= 3 ? t.shuttleBest : t.taxiBest}</p></div>
        <ul className="gp-plainlist">
          <li><strong>{t.rental}</strong> — {t.rentalSub}</li>
          <li><strong>{t.taxi}</strong> — {t.taxiSub}</li>
          <li><strong>{t.bus}</strong> — {t.busSub}</li>
        </ul>
      </section>

      <section className="gp-card">
        <span className="gp-eyebrow">{t.whereStaying}</span>
        <form className="gp-col" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); save("travel", travelPayload()); }}>
          <div className="gp-field">
            <label htmlFor="gp-hotel">{t.hotel}</label>
            <select id="gp-hotel" className="gp-input" value={stay.choice} onChange={(e) => setStay({ ...stay, choice: e.target.value })}>
              <option value="">—</option>
              {hotelNames.map((h) => <option key={h} value={h}>{h}</option>)}
              <option value="__other">{t.otherHotel}</option>
            </select>
          </div>
          {stay.choice === "__other" && <div className="gp-field"><label htmlFor="gp-hotel2">{t.hotelName}</label><input id="gp-hotel2" className="gp-input" value={stay.other} onChange={(e) => setStay({ ...stay, other: e.target.value })} /></div>}
          <div className="gp-grid2">
            <div className="gp-field"><label htmlFor="gp-ci">{t.arriving}</label><input id="gp-ci" type="date" className="gp-input" value={stay.arrive_date} onChange={(e) => setStay({ ...stay, arrive_date: e.target.value })} /></div>
            <div className="gp-field"><label htmlFor="gp-co">{t.leaving}</label><input id="gp-co" type="date" className="gp-input" value={stay.depart_date} onChange={(e) => setStay({ ...stay, depart_date: e.target.value })} /></div>
          </div>
          <p className="gp-small gp-muted">{t.stayHelp}</p>
          <button className="gp-btn outline" type="submit">{t.saveStay}</button>
        </form>
      </section>

      <section className="gp-card">
        <span className="gp-eyebrow">{t.venue}</span>
        <h2 className="gp-h2">{data.event?.venue_name || "Rincón de Guayabitos"}</h2>
        <p className="gp-muted">{data.event?.venue_address || "Rincón de Guayabitos, Nayarit, Mexico"}</p>
        <a className="gp-btn" href={data.event?.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([data.event?.venue_name, data.event?.venue_address || "Rincón de Guayabitos, Nayarit"].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={18} />{t.openMaps}</a>
      </section>

      <section className="gp-card">
        <span className="gp-eyebrow">{t.beforeYouGo}</span>
        <div className="gp-col">
          {CHECK_KEYS.map((k) => (
            <label key={k} className="gp-check">
              <input type="checkbox" checked={Boolean(checklist[k])} onChange={(e) => save("checklist", { ...checklist, [k]: e.target.checked })} />
              {t.checklist[k]}
            </label>
          ))}
        </div>
        <p className="gp-small gp-muted">{t.checklistSaved}</p>
      </section>

      <div className="gp-note plain"><Icon name="info" size={18} /><p>{t.pesosTip}</p></div>
    </div>
  );
}

/* ---------------- Messages / Songs / Wishes ---------------- */
function Messages(ctx) {
  const { t, sub, setSub } = ctx;
  return (
    <div className="gp-stack">
      <div className="gp-seg" role="group" aria-label={t.tabMessages}>
        <button type="button" aria-pressed={sub === "family"} onClick={() => setSub("family")}>{t.family}</button>
        <button type="button" aria-pressed={sub === "songs"} onClick={() => setSub("songs")}>{t.songTitle}</button>
        <button type="button" aria-pressed={sub === "wish"} onClick={() => setSub("wish")}>{t.wish}</button>
      </div>
      {sub === "family" && <FamilyThread {...ctx} />}
      {sub === "songs" && <Songs {...ctx} />}
      {sub === "wish" && <Wish {...ctx} />}
    </div>
  );
}

function FamilyThread({ data, t, lang, reload, setToast, onSignOut }) {
  const [category, setCategory] = useState("question");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const messages = data.messages || [];
  const hasUnread = messages.some((m) => m.sender === "family" && !m.read_by_guest_at);
  useEffect(() => {
    if (hasUnread) api("/api/guest/messages", { action: "read" }).then(reload).catch(() => {});
  }, [hasUnread, reload]);

  async function send(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/guest/messages", { category, body: text });
      setText("");
      setToast(t.msgSent);
      await reload();
    } catch (err) {
      if (err.status === 401) return onSignOut();
      setToast(err.message !== "error" ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="gp-col" style={{ gap: 6 }}>
        <h1 className="gp-h1">{t.msgTitle}</h1>
        <p className="gp-muted">{t.msgIntro}</p>
      </header>
      {messages.length === 0 ? <p className="gp-muted">{t.noMessages}</p> : (
        <ol className="gp-thread" aria-label="Conversation">
          {messages.map((m) => (
            <li key={m.id} className={m.sender === "guest" ? "me" : "them"}>
              <span className="gp-bubble">{m.body}</span>
              <span className="gp-small gp-muted">{m.sender === "guest" ? t.you : t.lucysFamily} · {new Date(m.created_at).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { month: "short", day: "numeric" })}</span>
            </li>
          ))}
        </ol>
      )}
      <form className="gp-card hl" onSubmit={send}>
        <fieldset className="gp-fieldset">
          <legend>{t.about}</legend>
          <div className="gp-chips">
            {[["question", t.catQuestion], ["song", t.catSong], ["note", t.catNote]].map(([id, label]) => (
              <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>
            ))}
          </div>
        </fieldset>
        <div className="gp-field"><label htmlFor="gp-msg">{t.yourMessage}</label><textarea id="gp-msg" rows={4} className="gp-input" placeholder={t.writeHere} value={text} onChange={(e) => setText(e.target.value)} required /></div>
        <button className="gp-btn" type="submit" disabled={busy || !text.trim()}><Icon name="send" size={18} />{t.send}</button>
        <p className="gp-small gp-muted" style={{ textAlign: "center" }}>{t.msgPrivate}</p>
      </form>
    </>
  );
}

function Songs({ data, t, reload, setToast, onSignOut }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [busy, setBusy] = useState(false);
  async function call(body) {
    setBusy(true);
    try {
      await api("/api/guest/songs", body);
      await reload();
      return true;
    } catch (e) {
      if (e.status === 401) onSignOut();
      else setToast(e.message !== "error" ? e.message : t.error);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="gp-col" style={{ gap: 6 }}>
        <h1 className="gp-h1">{t.songTitle}</h1>
        <p className="gp-muted">{t.songIntro}</p>
      </header>
      <form className="gp-card" onSubmit={async (e) => { e.preventDefault(); if (await call({ action: "add", title, artist })) { setTitle(""); setArtist(""); } }}>
        <div className="gp-field"><label htmlFor="gp-song">{t.songName}</label><input id="gp-song" className="gp-input" value={title} placeholder={t.songPlaceholder} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="gp-field"><label htmlFor="gp-artist">{t.artist}</label><input id="gp-artist" className="gp-input" value={artist} placeholder={t.artistPlaceholder} onChange={(e) => setArtist(e.target.value)} /></div>
        <button className="gp-btn" type="submit" disabled={busy}><Icon name="music" size={18} />{t.requestIt}</button>
      </form>
      <section className="gp-card">
        <span className="gp-eyebrow">{t.mostRequested}</span>
        {!data.songs?.length ? <p className="gp-muted">{t.noSongs}</p> : (
          <ul className="gp-songs">
            {data.songs.map((s) => (
              <li key={s.id}>
                <div className="gp-col"><strong>{s.title}</strong>{s.artist && <span className="gp-small gp-muted">{s.artist}</span>}</div>
                <button type="button" className="gp-vote" aria-pressed={s.voted} aria-label={t.voteFor(s.title)} disabled={busy} onClick={() => call({ action: "vote", id: s.id, on: !s.voted })}>
                  <Icon name="heart" size={16} />{s.votes}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Wish({ data, g, t, reload, setToast, onSignOut }) {
  const [mode, setMode] = useState("write");
  const [text, setText] = useState("");
  const [from, setFrom] = useState(partyNames(g).map((n) => n.split(" ")[0]).join(", "));
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  async function send(e) {
    e.preventDefault();
    setBusy(true);
    try {
      let video = {};
      if (mode === "video" && file) {
        const up = await uploadFile(file, { kind: "wish" });
        video = { video_path: up.path, ticket: up.ticket };
      }
      await api("/api/guest/wishes", { body: text, from_name: from, ...video });
      setText("");
      setFile(null);
      setToast(t.wishSent);
      await reload();
    } catch (err) {
      if (err.status === 401) return onSignOut();
      setToast(err.message !== "error" && err.message !== "upload_failed" ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="gp-col" style={{ gap: 6 }}>
        <h1 className="gp-h1">{t.wishTitle}</h1>
        <p className="gp-muted">{t.wishIntro}</p>
      </header>
      <div className="gp-seg" role="group" aria-label={t.wishTitle}>
        <button type="button" aria-pressed={mode === "write"} onClick={() => setMode("write")}>{t.write}</button>
        <button type="button" aria-pressed={mode === "video"} onClick={() => setMode("video")}><Icon name="video" size={18} />{t.recordVideo}</button>
      </div>
      <form className="gp-card" onSubmit={send}>
        {mode === "video" && (
          <div className="gp-field">
            <label htmlFor="gp-video" className="gp-drop"><Icon name="video" size={28} color="#b8005f" />{file ? file.name : t.chooseVideo}<span className="gp-small gp-muted">{t.videoHelp}</span></label>
            <input id="gp-video" type="file" accept="video/*" capture="user" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        )}
        <div className="gp-field"><label htmlFor="gp-wish">{t.yourMessage}</label><textarea id="gp-wish" rows={mode === "video" ? 3 : 7} className="gp-input" value={text} onChange={(e) => setText(e.target.value)} /></div>
        <div className="gp-field"><label htmlFor="gp-from-name">{t.from}</label><input id="gp-from-name" className="gp-input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <button className="gp-btn big" type="submit" disabled={busy || (!text.trim() && !(mode === "video" && file))}>{busy ? t.uploading : <><Icon name="heart" size={18} />{t.sendWish}</>}</button>
      </form>
      {data.wishes?.length > 0 && <section className="gp-card"><p className="gp-p">{t.sentWishes(data.wishes.length)}</p></section>}
    </>
  );
}

/* ---------------- RSVP + meals ---------------- */
function Rsvp({ data, g, t, lang, save }) {
  const [form, setForm] = useState({
    attending: g.attending || "",
    guest_count: Number(g.guest_count || 1),
    travel_from: g.travel_from || "",
    additional_guests: g.additional_guests || "",
    confirmed_guests: g.confirmed_guests || "",
    comments: g.comments || "",
  });
  const choice = isYes(form.attending) ? "yes" : isNo(form.attending) ? "no" : /tal vez|maybe/i.test(form.attending) ? "maybe" : "";
  const setChoice = (c) => setForm({ ...form, attending: c === "yes" ? "Si/Yes" : c === "no" ? "No" : "Tal vez" });

  const names = useMemo(() => partyNames(g), [g]);
  const initialMeals = Array.isArray(g.meals) && g.meals.length ? g.meals : names.map((n) => ({ name: n, meal: "", kid: false }));
  const [meals, setMeals] = useState(initialMeals);
  const [allergies, setAllergies] = useState(g.allergies || "");
  const options = (data.event?.meal_options || []).filter(Boolean);
  const kidsPlate = lang === "es" ? "Plato para niños" : "Kids' plate";

  return (
    <div className="gp-stack">
      <header className="gp-col" style={{ gap: 6 }}>
        <h1 className="gp-h1">{t.rsvpTitle}</h1>
        <p className="gp-small gp-muted">
          {g.updated_at ? `${t.lastUpdated} ${new Date(g.updated_at).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { month: "short", day: "numeric" })}` : ""}
          {data.event?.rsvp_deadline ? ` · ${t.changeUntil(data.event.rsvp_deadline)}` : ""}
        </p>
      </header>
      <form className="gp-card hl" onSubmit={(e) => { e.preventDefault(); save("rsvp", form, t.rsvpSaved); }}>
        <fieldset className="gp-fieldset">
          <legend>{t.attending}</legend>
          <div className="gp-seg">
            {[["yes", t.yes], ["no", t.no], ["maybe", t.maybe]].map(([id, label]) => <button key={id} type="button" aria-pressed={choice === id} onClick={() => setChoice(id)}>{label}</button>)}
          </div>
        </fieldset>
        <div className="gp-field">
          <label htmlFor="gp-count">{t.groupCount}</label>
          <div className="gp-row" style={{ gap: 10 }}>
            <button type="button" className="gp-round" aria-label="−1" onClick={() => setForm({ ...form, guest_count: Math.max(1, form.guest_count - 1) })}>−</button>
            <input id="gp-count" className="gp-input gp-count" inputMode="numeric" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: Math.max(1, Math.min(30, Number(e.target.value.replace(/\D/g, "")) || 1)) })} />
            <button type="button" className="gp-round" aria-label="+1" onClick={() => setForm({ ...form, guest_count: Math.min(30, form.guest_count + 1) })}>+</button>
          </div>
        </div>
        <div className="gp-field"><label htmlFor="gp-tf">{t.travelFrom}</label><input id="gp-tf" className="gp-input" value={form.travel_from} onChange={(e) => setForm({ ...form, travel_from: e.target.value })} /><small>{t.travelFromHelp}</small></div>
        <div className="gp-field"><label htmlFor="gp-names">{t.namesInGroup}</label><textarea id="gp-names" rows={4} className="gp-input" value={form.additional_guests} onChange={(e) => setForm({ ...form, additional_guests: e.target.value })} /></div>
        <div className="gp-field"><label htmlFor="gp-cm">{t.comments}</label><textarea id="gp-cm" rows={3} className="gp-input" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} /></div>
        <button className="gp-btn big" type="submit">{t.saveChanges}</button>
      </form>

      {isYes(g.attending) && (
        <form id="gp-meals" className="gp-card" onSubmit={(e) => { e.preventDefault(); save("meals", { meals, allergies }); }}>
          <span className="gp-eyebrow">{t.mealsTitle}</span>
          <p className="gp-muted gp-small">{options.length ? t.mealsIntro(data.event?.meal_deadline) : t.kidsNote}</p>
          {meals.map((m, i) => (
            <div key={i} className="gp-person">
              <div className="gp-field"><label htmlFor={`gp-pn-${i}`}>{t.personName}</label><input id={`gp-pn-${i}`} className="gp-input" value={m.name} onChange={(e) => setMeals(meals.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></div>
              {options.length > 0 && (
                <div className="gp-field">
                  <label htmlFor={`gp-meal-${i}`}>{t.mealFor(m.name.split(" ")[0] || "")}</label>
                  <select id={`gp-meal-${i}`} className="gp-input" value={m.meal} onChange={(e) => setMeals(meals.map((x, j) => (j === i ? { ...x, meal: e.target.value } : x)))}>
                    <option value="">{t.chooseMeal}</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                    <option value={kidsPlate}>{kidsPlate}</option>
                  </select>
                </div>
              )}
              <label className="gp-check"><input type="checkbox" checked={Boolean(m.kid)} onChange={(e) => setMeals(meals.map((x, j) => (j === i ? { ...x, kid: e.target.checked } : x)))} />{t.kid}</label>
            </div>
          ))}
          {meals.length < Number(g.guest_count || 1) && <button type="button" className="gp-link" onClick={() => setMeals([...meals, { name: "", meal: "", kid: false }])}>+ {t.addPerson}</button>}
          <div className="gp-field"><label htmlFor="gp-allergies">{t.allergies}</label><input id="gp-allergies" className="gp-input" value={allergies} onChange={(e) => setAllergies(e.target.value)} /></div>
          {options.length > 0 && <p className="gp-small gp-muted">{t.kidsNote}</p>}
          <button className="gp-btn" type="submit">{t.saveMeals}</button>
        </form>
      )}
    </div>
  );
}
