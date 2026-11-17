"use client";
// Programa tab: a side menu with Overview, Texts to guests, Event info, Court & events, Meals and Party extras.
import { useEffect, useRef, useState } from "react";
import { Icon, QR } from "../guest/ui";
import { portalCall, isYes, linkFor, copy, fmtTime, fmtDate, when } from "./PortalAdmin";
import {
  LINK_TEXT_PRESETS, DEFAULT_LINK_TEXT, WELCOME_PRESETS, DEFAULT_WELCOME_TEXT,
  renderMessage, renderLinkText, smsSegments, daysUntil, contactLinkLine,
} from "../../lib/link-text";

/* ---------- small helpers ---------- */
const digits = (r) => String(r.phone || "").replace(/\D/g, "");
// Same rule the server uses to decide where a number can be texted.
const phoneDigits = (r) => String(r.phone_normalized || r.phone || "").replace(/\D/g, "");
const isMexico = (r) => /^52\d{10}$/.test(phoneDigits(r));
const isUS = (r) => /^1\d{10}$/.test(phoneDigits(r));
const saidNo = (r) => !isYes(r.attending) && /^no\b/i.test(String(r.attending || "").trim());
const optedIn = (r) => Boolean(r.sms_opt_in && r.sms_opt_in_at && digits(r).length >= 10);
const initials = (n) => String(n || "").trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
const sumGuests = (list) => list.reduce((n, r) => n + Number(r.guest_count || 0), 0);

function Bar({ done, total }) {
  const pct = total ? Math.min(100, Math.round((done * 100) / total)) : 0;
  return (
    <div className="ad-bar">
      <div role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}><div style={{ width: `${pct}%` }} /></div>
      <span>{done} of {total}</span>
    </div>
  );
}

function useRunner(onNotice) {
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      onNotice(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };
  return [busy, run];
}

// Saves a value ~0.8s after the last change.
function useAutosave(value, save, enabled = true) {
  const [state, setState] = useState("saved");
  const first = useRef(true);
  const json = JSON.stringify(value);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled) return;
    setState("pending");
    const id = setTimeout(async () => {
      setState("saving");
      try {
        await save(value);
        setState("saved");
      } catch {
        setState("error");
      }
    }, 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json]);
  return state;
}

function SaveState({ state }) {
  if (state === "error") return <span className="ad-pill warn">Couldn't save — check your connection</span>;
  if (state === "saved") return <span className="ad-saved"><Icon name="check" size={16} />All changes saved</span>;
  return <span className="ad-saved" style={{ color: "#6e5260" }}>Saving…</span>;
}

const EVENT_CHECKS = [
  ["venue_name", "venue name"],
  ["maps_url", "Maps link"],
  ["rsvp_deadline", "RSVP deadline"],
  ["dress_code_es", "dress code"],
  ["meal_options", "meal options"],
  ["gifts_url", "gifts link"],
  ["thank_you_es", "thank-you note"],
];
function missingEvent(ev) {
  return EVENT_CHECKS.filter(([k]) => (Array.isArray(ev?.[k]) ? !ev[k].length : !String(ev?.[k] || "").trim())).map(([, label]) => label);
}

/* =====================================================================
   Programa
   ===================================================================== */
export default function ProgramPanel({ rsvps, portal, password, reloadPortal, updateRsvp, onNotice, goTab }) {
  const [section, setSection] = useState("overview");
  const ev = portal?.settings?.event || {};
  const stats = portal?.textStats || { welcomed: [], linked: [] };
  const welcomeList = rsvps.filter((r) => optedIn(r) && !saidNo(r));
  const linkList = rsvps.filter((r) => optedIn(r) && isYes(r.attending) && r.access_token);
  const welcomedN = welcomeList.filter((r) => stats.welcomed.includes(r.id)).length;
  const linkedN = linkList.filter((r) => stats.linked.includes(r.id)).length;
  const textsToDo = (welcomedN < welcomeList.length ? 1 : 0) + (linkedN < linkList.length ? 1 : 0);
  const missing = missingEvent(ev);

  const SECTIONS = [
    ["overview", "Overview", "grid", null],
    ["texts", "Texts to guests", "sms", textsToDo ? `${textsToDo} to send` : null],
    ["event", "Event info", "info", missing.length ? `${missing.length} missing` : null],
    ["court", "Court & events", "crown", null],
    ["meals", "Meals", "plate", null],
    ["party", "Party extras", "party", null],
  ];
  const props = { rsvps, portal, password, reloadPortal, updateRsvp, onNotice, goTab, go: setSection, welcomeList, linkList, welcomedN, linkedN, missing };

  return (
    <div className="ad-prog">
      <nav className="ad-side no-print" aria-label="Programa sections">
        <div className="ad-side-head">
          <h2>Programa</h2>
          <span className="ad-muted ad-small">{daysUntil()} days · Mon, Jan 4, 2027</span>
        </div>
        {SECTIONS.map(([id, label, icon, badge]) => (
          <button key={id} type="button" aria-current={section === id ? "page" : undefined} onClick={() => { setSection(id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <Icon name={icon} size={18} />{label}{badge && <span className="ad-badge">{badge}</span>}
          </button>
        ))}
      </nav>
      <div className="ad-main">
        {section === "overview" && <Overview {...props} />}
        {section === "texts" && <Texts {...props} />}
        {section === "event" && <EventInfo {...props} />}
        {section === "court" && <CourtEvents {...props} />}
        {section === "meals" && <Meals {...props} />}
        {section === "party" && <Party {...props} />}
      </div>
    </div>
  );
}

function Head({ title, sub, right }) {
  return (
    <div className="ad-head">
      <div><h1>{title}</h1>{sub && <p className="ad-muted">{sub}</p>}</div>
      {right}
    </div>
  );
}

/* ---------- Overview ---------- */
function Overview({ rsvps, portal, go, goTab, welcomeList, linkList, welcomedN, linkedN, missing }) {
  const confirmed = rsvps.filter((r) => isYes(r.attending));
  const hasMeals = (portal?.settings?.event?.meal_options || []).length > 0;
  const unpicked = confirmed.filter((r) => !(Array.isArray(r.meals) && r.meals.some((m) => m.meal))).length;
  const court = rsvps.filter((r) => r.role_title);
  const courtOk = court.filter((r) => r.rehearsal_confirmed).length;
  const unread = new Set((portal?.messages || []).filter((m) => m.sender === "guest" && !m.read_by_family_at).map((m) => m.rsvp_id)).size;

  const todos = [];
  if (welcomedN < welcomeList.length) todos.push(["contact", "Send the welcome text + contact card", `So guests save your number first · ${welcomedN} of ${welcomeList.length} sent`, "Start", () => go("texts"), true]);
  if (linkedN < linkList.length) todos.push(["link", "Text everyone their personal link", `Best 1–2 days after the welcome · ${linkedN} of ${linkList.length} sent`, "Open", () => go("texts")]);
  if (missing.length) todos.push(["info", "Finish the event info guests see", `Missing: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` +${missing.length - 3}` : ""}`, "Fill in", () => go("event")]);
  if (unread) todos.push(["msg", `${unread} guest ${unread === 1 ? "message" : "messages"} waiting`, "Reply from Guest messages", "Open", () => goTab("inbox")]);
  if (hasMeals && unpicked) todos.push(["plate", `${unpicked} confirmed ${unpicked === 1 ? "party hasn't" : "parties haven't"} picked meals`, portal?.settings?.event?.meal_deadline ? `Meal deadline: ${portal.settings.event.meal_deadline}` : "See who in Meals", "See who", () => go("meals")]);
  if (court.length && courtOk < court.length) todos.push(["crown", "Court rehearsal", `${courtOk} of ${court.length} confirmed`, "See who", () => go("court")]);

  const mealCounts = {};
  confirmed.forEach((r) => (Array.isArray(r.meals) ? r.meals : []).forEach((m) => { if (m.meal) mealCounts[m.meal] = (mealCounts[m.meal] || 0) + 1; }));

  const Tile = ({ icon, title, big, sub, action, onClick }) => (
    <button type="button" className="ad-tile" onClick={onClick}>
      <span className="ad-between" style={{ width: "100%" }}><Icon name={icon} size={22} color="#b8005f" /><Icon name="chev" size={18} color="#c98aa6" /></span>
      <span className="ad-eyebrow">{title}</span>
      <strong>{big}</strong>
      <span>{sub}</span>
      <em>{action}</em>
    </button>
  );

  return (
    <>
      <Head title="Hola, familia" sub="Here's what needs doing. Everything else is in the menu." />
      <section className="ad-card">
        <div className="ad-between"><h2>Next up</h2><span className="ad-muted ad-small">{todos.length ? `${todos.length} ${todos.length === 1 ? "thing" : "things"}` : "All caught up"}</span></div>
        {todos.length === 0 ? (
          <div className="ad-ok"><Icon name="check" size={18} />Nothing urgent right now.</div>
        ) : (
          <ul className="ad-todo">
            {todos.map(([icon, title, sub, action, onClick, primary]) => (
              <li key={title}>
                <span className="ad-todo-icon"><Icon name={icon} size={20} /></span>
                <div><strong>{title}</strong><span>{sub}</span></div>
                <button type="button" className={`ad-btn ${primary ? "" : "ghost"}`} onClick={onClick}>{action}</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="ad-grid3">
        <Tile icon="sms" title="Texts to guests" big={`${welcomedN} / ${welcomeList.length}`} sub={`Welcome sent · ${linkedN} of ${linkList.length} personal links`} action="Send texts" onClick={() => go("texts")} />
        <Tile icon="info" title="Event info" big={`${EVENT_CHECKS.length - missing.length} of ${EVENT_CHECKS.length}`} sub="Venue, dress code, schedule and page dates" action={missing.length ? "Finish details" : "Review"} onClick={() => go("event")} />
        <Tile icon="crown" title="Court & events" big={`${court.length} ${court.length === 1 ? "role" : "roles"}`} sub={`${(portal?.events || []).length} weekend events`} action="Manage" onClick={() => go("court")} />
        <Tile icon="plate" title="Meals" big={Object.values(mealCounts).length ? Object.values(mealCounts).join(" · ") : "—"} sub={hasMeals ? Object.keys(mealCounts).join(" · ") || "No picks yet" : "Add meal options in Event info"} action="Open" onClick={() => go("meals")} />
        <Tile icon="music" title="Songs" big={(portal?.songs || []).filter((s) => !s.hidden).length} sub="Requests from guests · DJ link ready" action="Open" onClick={() => go("party")} />
        <Tile icon="heart" title="Wishes & photos" big={(portal?.wishes || []).length} sub={`${(portal?.wishes || []).filter((w) => w.video_url).length} videos for Lucy · ${(portal?.photos || []).length} photos`} action="Open" onClick={() => go("party")} />
      </div>
    </>
  );
}

/* ---------- Texts to guests ---------- */
function Texts(props) {
  const { portal, rsvps, welcomeList, linkList, welcomedN, linkedN, goTab } = props;
  const [sending, setSending] = useState(null); // 'welcome' | 'link'
  const [editing, setEditing] = useState(null);
  const welcomeText = portal?.settings?.welcomeText || DEFAULT_WELCOME_TEXT;
  const linkText = portal?.settings?.linkText || DEFAULT_LINK_TEXT;
  const sample = welcomeList[0] || rsvps[0] || {};
  const linkSample = linkList[0] || sample;
  const card = portal?.contactCard || {};
  const welcomeDone = welcomeList.length > 0 && welcomedN >= welcomeList.length;
  const linkDone = linkList.length > 0 && linkedN >= linkList.length;

  const status = (done, n, started) => done ? <span className="ad-pill ok">All sent</span> : started ? <span className="ad-pill pink">In progress</span> : n ? <span className="ad-pill warn">Not sent yet</span> : <span className="ad-pill gray">Nobody to send to yet</span>;

  return (
    <>
      <Head title="Texts to guests" sub="Send these in order. Each guest only ever gets each text once." />
      {!portal?.smsReady && <div className="ad-notice">Texting isn't set up yet — the Twilio environment variables are missing in Vercel.</div>}

      <section className="ad-card ad-step">
        <span className="ad-step-num">1</span>
        <div className="ad-step-body">
          <div className="ad-row"><h2>Welcome + contact card</h2>{status(welcomeDone, welcomeList.length, welcomedN > 0)}</div>
          <p className="ad-muted">Introduces your number and lets guests save it with a photo, so your texts never show as an unknown sender. Mexico numbers get a link to the card instead.</p>
          <Bar done={welcomedN} total={welcomeList.length} />
          {!card.ready && <div className="ad-notice">To attach the contact card, add <code>SMS_CONTACT_PHONE</code> (the number your texts come from, like +13105551234) in Vercel, then redeploy.</div>}
          <div className="ad-row">
            <button type="button" className="ad-btn" disabled={!portal?.smsReady || welcomeDone} onClick={() => setSending("welcome")}><Icon name="send" size={16} />{welcomedN ? "Send the rest" : `Send to ${welcomeList.length} guests`}</button>
            <button type="button" className="ad-btn ghost" disabled={!portal?.smsReady} onClick={() => setSending("welcome-test")}>Send a test to me</button>
            <button type="button" className="ad-link" onClick={() => setEditing(editing === "welcome" ? null : "welcome")}>{editing === "welcome" ? "Close editor" : "Edit message"}</button>
          </div>
        </div>
        <div className="ad-phone" aria-label="Message preview">
          <div className="ad-bubble">{renderMessage(welcomeText, sample, linkFor(portal?.siteUrl, sample), { fallback: DEFAULT_WELCOME_TEXT })}</div>
          <div className="ad-vcard"><img src="/contact-photo.jpg" alt="" /><div><strong>Lucy's Quinceañera</strong><b>Tap to save contact</b></div></div>
        </div>
        {editing === "welcome" && <MessageEditor kind="welcome" {...props} />}
      </section>

      <section className="ad-card ad-step">
        <span className={`ad-step-num ${welcomedN ? "" : "later"}`}>2</span>
        <div className="ad-step-body">
          <div className="ad-row"><h2>Personal link</h2>{status(linkDone, linkList.length, linkedN > 0)}</div>
          <p className="ad-muted">Their private page: table, travel, RSVP and messages. Goes to confirmed guests. Best 1–2 days after the welcome, so it arrives from a saved contact.</p>
          <Bar done={linkedN} total={linkList.length} />
          <div className="ad-row">
            <button type="button" className={`ad-btn ${welcomedN ? "" : "ghost"}`} disabled={!portal?.smsReady || linkDone} onClick={() => setSending("link")}><Icon name="send" size={16} />{linkedN ? "Send the rest" : `Send to ${linkList.length} guests`}</button>
            <button type="button" className="ad-btn ghost" disabled={!portal?.smsReady} onClick={() => setSending("link-test")}>Send a test to me</button>
            <button type="button" className="ad-link" onClick={() => setEditing(editing === "link" ? null : "link")}>{editing === "link" ? "Close editor" : "Edit message"}</button>
          </div>
        </div>
        <div className="ad-phone" aria-label="Message preview">
          <div className="ad-bubble">{renderLinkText(linkText, linkSample, linkFor(portal?.siteUrl, linkSample) || `${portal?.siteUrl || ""}/g/…`)}</div>
        </div>
        {editing === "link" && <MessageEditor kind="link" {...props} />}
      </section>

      <section className="ad-card" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
        <Icon name="mega" size={24} color="#b8005f" />
        <div className="ad-field" style={{ flex: 1, minWidth: 240, gap: 2 }}>
          <strong>Updates later on</strong>
          <span className="ad-muted">Shuttle times, schedule changes, “see you tomorrow” — post them as announcements and text them in one click.</span>
        </div>
        <button type="button" className="ad-btn ghost" onClick={() => goTab("arrivals")}>Go to Arrivals → Announcements</button>
      </section>

      {sending && <SendModal kind={sending.replace("-test", "")} startWithTest={sending.endsWith("-test")} onClose={() => setSending(null)} {...props} />}
    </>
  );
}

function MessageEditor({ kind, portal, password, reloadPortal, onNotice }) {
  const welcome = kind === "welcome";
  const saved = (welcome ? portal?.settings?.welcomeText : portal?.settings?.linkText) || (welcome ? DEFAULT_WELCOME_TEXT : DEFAULT_LINK_TEXT);
  const presets = welcome ? WELCOME_PRESETS : LINK_TEXT_PRESETS;
  const [text, setText] = useState({ es: saved.es, en: saved.en || "" });
  const [busy, run] = useRunner(onNotice);
  const needsLink = !welcome && (!/\{\s*link\s*\}/i.test(text.es) || (text.en.trim() && !/\{\s*link\s*\}/i.test(text.en)));
  const seg = smsSegments(renderMessage(text, {}, "https://rsvp.lucysquinceanera.com/g/" + "x".repeat(64), { requireLink: !welcome }));

  return (
    <div className="ad-field" style={{ width: "100%", gap: 12, borderTop: "1px solid #f6e3ec", paddingTop: 14 }}>
      <div className="ad-row"><span className="ad-muted">Start from:</span>{Object.entries(presets).map(([k, p]) => <button key={k} type="button" className="mini-btn" onClick={() => setText({ es: p.es, en: p.en })}>{p.label}</button>)}</div>
      <div className="ad-form2">
        <div className="ad-field"><label htmlFor={`${kind}-es`}>Spanish</label><textarea id={`${kind}-es`} rows={8} value={text.es} onChange={(e) => setText({ ...text, es: e.target.value })} /></div>
        <div className="ad-field"><label htmlFor={`${kind}-en`}>English (guests who chose English)</label><textarea id={`${kind}-en`} rows={8} value={text.en} onChange={(e) => setText({ ...text, en: e.target.value })} /></div>
      </div>
      <p className="ad-muted ad-small">Starts with <b>Lucy's Quinceañera:</b> automatically. Fill-ins: <code>{"{nombre}"}</code> first name · <code>{"{dias}"}</code> days left ({daysUntil()}) · <code>{"{link}"}</code> their personal link{welcome ? " (optional)" : ""}. About {seg.segments} text segments{welcome ? " (one picture message for US numbers)" : ""}.</p>
      {needsLink && <div className="ad-notice">Add {"{link}"} where their personal link should go.</div>}
      <button type="button" className="ad-btn" style={{ alignSelf: "flex-start" }} disabled={busy || needsLink || !text.es.trim()} onClick={() => run(async () => { await portalCall(password, "save-settings", { key: welcome ? "welcome_text" : "link_text", value: text }); await reloadPortal(); onNotice("Message saved."); })}>Save message</button>
    </div>
  );
}

function SendModal({ kind, startWithTest, onClose, rsvps, portal, password, reloadPortal, onNotice }) {
  const welcome = kind === "welcome";
  const [audience, setAudience] = useState("all");
  const [attachCard, setAttachCard] = useState(Boolean(portal?.contactCard?.ready));
  const [testId, setTestId] = useState("");
  const [tested, setTested] = useState(false);
  const [country, setCountry] = useState("all");
  const [retryFailed, setRetryFailed] = useState(true);
  const [result, setResult] = useState("");
  const [busy, run] = useRunner((m) => setResult(m));
  const stats = portal?.textStats || { welcomed: [], linked: [] };
  const inCountry = (r) => (country === "mx" ? isMexico(r) : country === "us" ? isUS(r) : true);
  const everyone = welcome
    ? rsvps.filter((r) => optedIn(r) && (audience === "confirmed" ? isYes(r.attending) : !saidNo(r)))
    : rsvps.filter((r) => optedIn(r) && isYes(r.attending) && r.access_token);
  const list = everyone.filter(inCountry);
  const sentIds = welcome ? stats.welcomed : stats.linked;
  const sent = list.filter((r) => sentIds.includes(r.id)).length;
  const mexico = list.filter(isMexico).length;
  const mxLeft = everyone.filter((r) => isMexico(r) && !sentIds.includes(r.id)).length;
  const step = !tested && startWithTest ? 2 : sent >= list.length && list.length ? 4 : tested || sent ? 3 : 1;
  const action = welcome ? "text-welcome" : "text-links";
  const template = welcome ? portal?.settings?.welcomeText || DEFAULT_WELCOME_TEXT : portal?.settings?.linkText || DEFAULT_LINK_TEXT;
  const extra = { country: country === "all" ? undefined : country, retryFailed, ...(welcome ? { audience, attachCard, round: "welcome-1" } : { round: "invite-1" }) };

  async function sendTest() {
    await run(async () => {
      const d = await portalCall(password, action, { template, ids: [testId], test: true, ...extra });
      setTested(true);
      setResult(d.submitted ? "Test sent — check your phone." : `Not sent: ${d.notes?.[0] || "this guest can't get texts (no opt-in or invalid phone)"}.`);
    });
  }
  async function sendNext() {
    if (!confirm(`Send to the next ${Math.min(25, list.length - sent)} guests?`)) return;
    await run(async () => {
      const d = await portalCall(password, action, { template, ...extra });
      setResult(d.note);
      onNotice(d.note);
      await reloadPortal();
    });
  }

  return (
    <div className="ad-modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="ad-modal" role="dialog" aria-modal="true" aria-label={welcome ? "Send the welcome text" : "Send personal links"}>
        <div className="ad-between">
          <h2 style={{ fontSize: 26 }}>{welcome ? "Send the welcome text" : "Send personal links"}</h2>
          <button type="button" className="ad-icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <ol className="ad-steps" aria-label="Steps">
          <li className={step > 1 ? "done" : "on"}><b>{step > 1 ? "✓" : 1}</b>Check who gets it</li>
          <li className={tested ? "done" : step === 2 ? "on" : ""}><b>{tested ? "✓" : 2}</b>Test on your phone</li>
          <li className={step >= 4 ? "done" : step === 3 ? "on" : ""}><b>{step >= 4 ? "✓" : 3}</b>Send</li>
        </ol>

        <div className="ad-grid3">
          <div className="ad-mini-stat"><strong>{list.length}</strong><span>{welcome ? "guests opted in" : "confirmed, opted in"}</span></div>
          <div className="ad-mini-stat"><strong>{welcome && attachCard ? list.length - mexico : list.length - mexico}</strong><span>{welcome && attachCard ? "get text + contact card" : "US/Canada numbers"}</span></div>
          <div className="ad-mini-stat"><strong>{mexico}</strong><span>{welcome && attachCard ? "Mexico numbers get a link" : "Mexico numbers"}</span></div>
        </div>

        {welcome && (
          <div className="ad-form2">
            <div className="ad-field">
              <label htmlFor="sm-aud">Who gets it</label>
              <select id="sm-aud" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="all">Everyone opted in who hasn't said No</option>
                <option value="confirmed">Only confirmed guests</option>
              </select>
            </div>
            <label className="ad-check" style={{ alignSelf: "end" }}>
              <input type="checkbox" checked={attachCard} disabled={!portal?.contactCard?.ready} onChange={(e) => setAttachCard(e.target.checked)} />
              Attach the contact card{!portal?.contactCard?.ready && " (set SMS_CONTACT_PHONE first)"}
            </label>
          </div>
        )}

        <div className="ad-form2">
          <div className="ad-field">
            <label htmlFor="sm-country">Which numbers</label>
            <select id="sm-country" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="all">Everyone ({everyone.length})</option>
              <option value="us">US &amp; Canada (+1) only ({everyone.filter(isUS).length})</option>
              <option value="mx">Mexico (+52) only ({everyone.filter(isMexico).length})</option>
            </select>
          </div>
          <label className="ad-check" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={retryFailed} onChange={(e) => setRetryFailed(e.target.checked)} />
            Try again for texts that failed before
          </label>
        </div>
        {country !== "mx" && mxLeft > 0 && sent > 0 && (
          <div className="ad-notice">{mxLeft} Mexico {mxLeft === 1 ? "number hasn't" : "numbers haven't"} gotten this yet. Choose <b>Mexico (+52) only</b> above to send just to them.</div>
        )}

        <div className="ad-field">
          <label htmlFor="sm-test">Send a test to yourself first</label>
          <div className="ad-row" style={{ flexWrap: "nowrap" }}>
            <select id="sm-test" value={testId} onChange={(e) => setTestId(e.target.value)}>
              <option value="">Choose your name…</option>
              {rsvps.slice().sort((a, b) => a.full_name.localeCompare(b.full_name)).map((r) => <option key={r.id} value={r.id}>{r.full_name}{optedIn(r) ? "" : " (no text opt-in)"}</option>)}
            </select>
            <button type="button" className="ad-btn ghost" disabled={busy || !testId} onClick={sendTest}>Send test</button>
          </div>
        </div>

        <div className="ad-field" style={{ gap: 8 }}>
          <div className="ad-between"><strong>Sending in groups of 25</strong><span className="ad-muted ad-small">{sent} sent · {Math.max(0, list.length - sent)} to go</span></div>
          <Bar done={sent} total={list.length} />
        </div>
        {result && <div className={/^(Sent|Texted|Test sent)/.test(result) ? "ad-ok" : "ad-notice"} role="status">{result}</div>}
        <div className="ad-row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="ad-btn ghost" onClick={onClose}>{sent ? "Done for now" : "Cancel"}</button>
          <button type="button" className="ad-btn" disabled={busy || !list.length || sent >= list.length} onClick={sendNext}><Icon name="send" size={16} />{busy ? "Sending…" : sent ? "Send the next 25" : `Send to the first ${Math.min(25, list.length)}`}</button>
        </div>
        <p className="ad-muted ad-small">You can close this and come back. Guests who already got it are always skipped.</p>
      </section>
    </div>
  );
}

/* ---------- Event info ---------- */
function Group({ title, sub, missing = 0, children }) {
  return (
    <section className="ad-card">
      <div className="ad-between" style={{ alignItems: "flex-start" }}>
        <div className="ad-field" style={{ gap: 2 }}><h2 style={{ fontSize: 20 }}>{title}</h2>{sub && <span className="ad-muted ad-small">{sub}</span>}</div>
        {missing ? <span className="ad-pill warn">{missing} missing</span> : <span className="ad-pill ok">Complete</span>}
      </div>
      {children}
    </section>
  );
}

function EventInfo({ portal, password, reloadPortal, onNotice }) {
  const saveKey = async (key, value) => {
    await portalCall(password, "save-settings", { key, value });
  };
  const [ev, setEv] = useState({ ...(portal?.settings?.event || {}), meal_options: portal?.settings?.event?.meal_options || [] });
  const [schedule, setSchedule] = useState(portal?.settings?.schedule || []);
  const [mode, setMode] = useState(portal?.settings?.mode || {});
  const [newMeal, setNewMeal] = useState("");
  const [editRow, setEditRow] = useState(null);
  const s1 = useAutosave(ev, (v) => saveKey("event", v));
  const s2 = useAutosave(schedule, (v) => saveKey("schedule", v.filter((x) => x.time && x.es).sort((a, b) => a.time.localeCompare(b.time))), editRow === null);
  const s3 = useAutosave(mode, (v) => saveKey("mode", v));
  const states = [s1, s2, s3];
  const overall = states.includes("error") ? "error" : states.some((x) => x === "saving" || x === "pending") ? "saving" : "saved";
  useEffect(() => () => { reloadPortal(); }, []); // refresh counts when leaving
  const f = (k) => ({ value: ev[k] || "", onChange: (e) => setEv({ ...ev, [k]: e.target.value }) });
  const miss = (...keys) => keys.filter((k) => !String(ev[k] || "").trim()).length;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia_Banderas" }).format(new Date());
  const live = mode.force || (mode.after_date && today >= mode.after_date ? "after" : mode.tonight_date && today >= mode.tonight_date ? "tonight" : "pre");

  return (
    <>
      <Head title="Event info" sub="What guests see on their page. Saves as you type." right={<SaveState state={overall} />} />
      <div className="ad-grid2">
        <div className="ad-main">
          <Group title="The venue" sub="Shown on Travel and Tonight" missing={miss("venue_name", "maps_url")}>
            <div className="ad-field"><label htmlFor="ev-vn">Venue name</label><input id="ev-vn" placeholder="Salón …" {...f("venue_name")} /></div>
            <div className="ad-field"><label htmlFor="ev-va">Address</label><input id="ev-va" {...f("venue_address")} /></div>
            <div className="ad-field"><label htmlFor="ev-vm">Google Maps link</label><input id="ev-vm" placeholder="https://maps.app.goo.gl/…" {...f("maps_url")} /></div>
          </Group>
          <Group title="What to wear" sub="Shown on Home and Your role" missing={miss("dress_code_es")}>
            <div className="ad-form2">
              <div className="ad-field"><label htmlFor="ev-d1">Dress code (Spanish)</label><input id="ev-d1" {...f("dress_code_es")} /></div>
              <div className="ad-field"><label htmlFor="ev-d2">Dress code (English)</label><input id="ev-d2" {...f("dress_code_en")} /></div>
            </div>
            <div className="ad-field"><label htmlFor="ev-cc">Court color</label><input id="ev-cc" placeholder="rosa / blush pink" {...f("court_color")} /></div>
          </Group>
          <Group title="Dates & deadlines" sub="Guests see these as written" missing={miss("rsvp_deadline")}>
            <div className="ad-form2">
              <div className="ad-field"><label htmlFor="ev-r">RSVP deadline</label><input id="ev-r" placeholder="15 de diciembre" {...f("rsvp_deadline")} /></div>
              <div className="ad-field"><label htmlFor="ev-m">Meal choice deadline</label><input id="ev-m" placeholder="20 de diciembre" {...f("meal_deadline")} /></div>
            </div>
          </Group>
          <Group title="Meal options" sub="Guests pick one per person. Kids' plate is always included." missing={ev.meal_options.length ? 0 : 1}>
            <div className="ad-row">
              {ev.meal_options.map((m) => <span key={m} className="ad-chip">{m}<button type="button" aria-label={`Remove ${m}`} onClick={() => setEv({ ...ev, meal_options: ev.meal_options.filter((x) => x !== m) })}><Icon name="x" size={12} /></button></span>)}
            </div>
            <form className="ad-row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); const m = newMeal.trim(); if (m && !ev.meal_options.includes(m)) setEv({ ...ev, meal_options: [...ev.meal_options, m] }); setNewMeal(""); }}>
              <label htmlFor="ev-meal" className="sr-only">New meal option</label>
              <input id="ev-meal" value={newMeal} onChange={(e) => setNewMeal(e.target.value)} placeholder="e.g. Pollo en mole" />
              <button type="submit" className="ad-btn ghost small"><Icon name="plus" size={14} />Add</button>
            </form>
          </Group>
          <Group title="Gifts" sub="Shown as a tile on Home" missing={miss("gifts_url")}>
            <div className="ad-field"><label htmlFor="ev-g">Gifts link</label><input id="ev-g" placeholder="https://lucysquinceanera.com/gifts" {...f("gifts_url")} /></div>
            <div className="ad-form2">
              <div className="ad-field"><label htmlFor="ev-g1">Short note (Spanish)</label><input id="ev-g1" placeholder="Lluvia de sobres" {...f("gifts_note_es")} /></div>
              <div className="ad-field"><label htmlFor="ev-g2">Short note (English)</label><input id="ev-g2" {...f("gifts_note_en")} /></div>
            </div>
          </Group>
        </div>

        <div className="ad-main">
          <Group title="Night-of schedule" sub="Drives the “Now / Next” card on Jan 4" missing={schedule.length ? 0 : 1}>
            <ol className="ad-list ad-sched">
              {schedule.map((s, i) => editRow === i ? (
                <li key={i} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                  <div className="ad-form2">
                    <div className="ad-field"><label htmlFor={`sc-t-${i}`}>Time</label><input id={`sc-t-${i}`} type="time" value={s.time} onChange={(e) => setSchedule(schedule.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} /></div>
                    <div className="ad-field"><label htmlFor={`sc-es-${i}`}>Spanish</label><input id={`sc-es-${i}`} value={s.es} onChange={(e) => setSchedule(schedule.map((x, j) => (j === i ? { ...x, es: e.target.value } : x)))} /></div>
                  </div>
                  <div className="ad-field"><label htmlFor={`sc-en-${i}`}>English</label><input id={`sc-en-${i}`} value={s.en} onChange={(e) => setSchedule(schedule.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)))} /></div>
                  <div className="ad-row">
                    <button type="button" className="ad-btn small" onClick={() => { setEditRow(null); setSchedule([...schedule].sort((a, b) => (a.time || "99").localeCompare(b.time || "99"))); }}>Done</button>
                    <button type="button" className="ad-btn danger small" onClick={() => { setEditRow(null); setSchedule(schedule.filter((_, j) => j !== i)); }}>Remove</button>
                  </div>
                </li>
              ) : (
                <li key={i}>
                  <span className="ad-time">{fmtTime(s.time) || "—"}</span>
                  <div className="ad-field" style={{ gap: 0 }}><strong>{s.es || "—"}</strong><span className="ad-muted ad-small">{s.en}</span></div>
                  <button type="button" className="ad-icon-btn" aria-label={`Edit ${s.en || s.es}`} onClick={() => setEditRow(i)}><Icon name="edit" size={16} /></button>
                </li>
              ))}
            </ol>
            <button type="button" className="ad-btn ghost small" style={{ alignSelf: "flex-start" }} onClick={() => { setSchedule([...schedule, { time: "", es: "", en: "" }]); setEditRow(schedule.length); }}><Icon name="plus" size={14} />Add a moment</button>
          </Group>

          <Group title="What guests see right now" sub="Switches on its own by date">
            <div className="ad-modes">
              <div className={`ad-mode ${live === "pre" ? "on" : ""}`}><strong>Before</strong><span className="ad-muted ad-small">Until then</span></div>
              <div className={`ad-mode ${live === "tonight" ? "on" : ""}`}><strong>Tonight</strong><label htmlFor="md-t" className="sr-only">Tonight starts</label><input id="md-t" type="date" value={mode.tonight_date || ""} onChange={(e) => setMode({ ...mode, tonight_date: e.target.value })} /></div>
              <div className={`ad-mode ${live === "after" ? "on" : ""}`}><strong>Thank you</strong><label htmlFor="md-a" className="sr-only">Thank-you page starts</label><input id="md-a" type="date" value={mode.after_date || ""} onChange={(e) => setMode({ ...mode, after_date: e.target.value })} /></div>
            </div>
            <details>
              <summary className="ad-link" style={{ display: "inline-block" }}>Preview a mode on every guest page</summary>
              <div className="ad-field" style={{ marginTop: 8 }}>
                <label htmlFor="md-f">Show this mode now</label>
                <select id="md-f" value={mode.force || ""} onChange={(e) => setMode({ ...mode, force: e.target.value })}>
                  <option value="">Automatic by date</option>
                  <option value="pre">Before</option>
                  <option value="tonight">Tonight</option>
                  <option value="after">Thank you</option>
                </select>
                {mode.force && <span className="ad-pill warn" style={{ alignSelf: "flex-start" }}>Every guest sees “{mode.force}” until you set this back to Automatic</span>}
              </div>
            </details>
          </Group>

          <Group title="Thank-you note from Lucy" sub="Shows on the thank-you page" missing={miss("thank_you_es")}>
            <div className="ad-field"><label htmlFor="ev-ty1">Spanish</label><textarea id="ev-ty1" rows={3} placeholder="Escribe la nota de Lucy…" {...f("thank_you_es")} /></div>
            <div className="ad-field"><label htmlFor="ev-ty2">English</label><textarea id="ev-ty2" rows={3} {...f("thank_you_en")} /></div>
          </Group>
        </div>
      </div>
    </>
  );
}

/* ---------- Court & events ---------- */
function RoleForm({ rsvps, initial, password, updateRsvp, onNotice, onDone, pickGuest }) {
  const [guestId, setGuestId] = useState(initial?.id || "");
  const r0 = rsvps.find((r) => r.id === guestId) || initial || {};
  const [f, setF] = useState({ role_title: r0.role_title || "", role_moment: r0.role_moment || "", role_details: r0.role_details || "", guest_tags: (r0.guest_tags || []).join(", ") || "court" });
  const [busy, run] = useRunner(onNotice);
  const save = (fields) => run(async () => {
    const d = await portalCall(password, "save-guest", { id: guestId, fields });
    updateRsvp(d.rsvp);
    onNotice(fields.role_title ? "Role saved — it shows on their page now." : "Role removed.");
    onDone();
  });
  return (
    <form className="ad-field" style={{ gap: 10, gridColumn: "1 / -1", background: "#fffafc", border: "1px solid #f0d6e2", borderRadius: 16, padding: 14 }} onSubmit={(e) => { e.preventDefault(); save(f); }}>
      {pickGuest && (
        <div className="ad-field">
          <label htmlFor="rf-guest">Guest</label>
          <select id="rf-guest" value={guestId} required onChange={(e) => { const r = rsvps.find((x) => x.id === e.target.value); setGuestId(e.target.value); if (r) setF({ role_title: r.role_title || "", role_moment: r.role_moment || "", role_details: r.role_details || "", guest_tags: (r.guest_tags || []).join(", ") || "court" }); }}>
            <option value="">Choose…</option>
            {rsvps.slice().sort((a, b) => a.full_name.localeCompare(b.full_name)).map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </div>
      )}
      <div className="ad-form2">
        <div className="ad-field"><label htmlFor="rf-role">Role</label><input id="rf-role" value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} placeholder="Chambelán de honor" required /></div>
        <div className="ad-field"><label htmlFor="rf-moment">Their moment</label><input id="rf-moment" value={f.role_moment} onChange={(e) => setF({ ...f, role_moment: e.target.value })} placeholder="9:20 PM — line up by the stage" /></div>
      </div>
      <div className="ad-field"><label htmlFor="rf-steps">Their part (one step per line)</label><textarea id="rf-steps" rows={3} value={f.role_details} onChange={(e) => setF({ ...f, role_details: e.target.value })} /></div>
      <div className="ad-field"><label htmlFor="rf-tags">Groups (for invites and announcements)</label><input id="rf-tags" value={f.guest_tags} onChange={(e) => setF({ ...f, guest_tags: e.target.value })} placeholder="court, padrinos" /></div>
      <div className="ad-row">
        <button type="submit" className="ad-btn small" disabled={busy || !guestId}>Save role</button>
        <button type="button" className="ad-btn ghost small" onClick={onDone}>Cancel</button>
        {!pickGuest && <button type="button" className="ad-btn danger small" disabled={busy} onClick={() => confirm("Remove this role?") && save({ role_title: "", role_moment: "", role_details: "" })}>Remove role</button>}
      </div>
    </form>
  );
}

function EventForm({ initial, tags, password, reloadPortal, onNotice, onDone }) {
  const [e1, setE] = useState({ title_es: "", title_en: "", event_date: "", duration_minutes: 120, location: "", maps_url: "", audience: "all", ask_rsvp: false, ...initial, event_time: initial?.event_time || "" });
  const [busy, run] = useRunner(onNotice);
  return (
    <form className="ad-field" style={{ gap: 10, gridColumn: "1 / -1", background: "#fffafc", border: "1px solid #f0d6e2", borderRadius: 16, padding: 14 }} onSubmit={(ev) => { ev.preventDefault(); run(async () => { await portalCall(password, "save-event", { event: e1 }); await reloadPortal(); onNotice("Event saved."); onDone(); }); }}>
      <div className="ad-form2">
        <div className="ad-field"><label htmlFor="ef-es">Name (Spanish)</label><input id="ef-es" value={e1.title_es} onChange={(e) => setE({ ...e1, title_es: e.target.value })} required placeholder="Ensayo de la corte" /></div>
        <div className="ad-field"><label htmlFor="ef-en">Name (English)</label><input id="ef-en" value={e1.title_en || ""} onChange={(e) => setE({ ...e1, title_en: e.target.value })} placeholder="Court rehearsal" /></div>
        <div className="ad-field"><label htmlFor="ef-d">Date</label><input id="ef-d" type="date" value={e1.event_date} onChange={(e) => setE({ ...e1, event_date: e.target.value })} required /></div>
        <div className="ad-field"><label htmlFor="ef-t">Time (Guayabitos)</label><input id="ef-t" type="time" value={e1.event_time} onChange={(e) => setE({ ...e1, event_time: e.target.value })} /></div>
        <div className="ad-field"><label htmlFor="ef-l">Place</label><input id="ef-l" value={e1.location || ""} onChange={(e) => setE({ ...e1, location: e.target.value })} /></div>
        <div className="ad-field"><label htmlFor="ef-m">Maps link</label><input id="ef-m" value={e1.maps_url || ""} onChange={(e) => setE({ ...e1, maps_url: e.target.value })} /></div>
        <div className="ad-field"><label htmlFor="ef-a">Who's invited</label>
          <select id="ef-a" value={e1.audience} onChange={(e) => setE({ ...e1, audience: e.target.value })}>
            <option value="all">Everyone</option>
            {tags.map((t) => <option key={t} value={`tag:${t}`}>Group: {t}</option>)}
          </select>
        </div>
        <div className="ad-field"><label htmlFor="ef-len">Length (minutes)</label><input id="ef-len" type="number" min="15" value={e1.duration_minutes || 120} onChange={(e) => setE({ ...e1, duration_minutes: e.target.value })} /></div>
      </div>
      <label className="ad-check"><input type="checkbox" checked={Boolean(e1.ask_rsvp)} onChange={(e) => setE({ ...e1, ask_rsvp: e.target.checked })} />Ask guests “Going / Can't go”</label>
      <div className="ad-row">
        <button type="submit" className="ad-btn small" disabled={busy}>Save event</button>
        <button type="button" className="ad-btn ghost small" onClick={onDone}>Cancel</button>
        {initial?.id && <button type="button" className="ad-btn danger small" disabled={busy} onClick={() => confirm("Delete this event?") && run(async () => { await portalCall(password, "delete-event", { id: initial.id }); await reloadPortal(); onDone(); })}>Delete</button>}
      </div>
    </form>
  );
}

function CourtEvents({ rsvps, portal, password, reloadPortal, updateRsvp, onNotice }) {
  const [editRole, setEditRole] = useState(null); // id | 'new'
  const [editEvent, setEditEvent] = useState(null); // id | 'new'
  const court = rsvps.filter((r) => r.role_title).sort((a, b) => a.full_name.localeCompare(b.full_name));
  const ok = court.filter((r) => r.rehearsal_confirmed).length;
  const tags = [...new Set(["court", "padrinos", "family", ...rsvps.flatMap((r) => r.guest_tags || [])])];
  const going = (id) => (portal?.eventRsvps || []).filter((x) => x.event_id === id && x.going).length;
  const invited = (e) => rsvps.filter((r) => (e.audience === "all" ? isYes(r.attending) : (r.guest_tags || []).includes(e.audience.replace(/^tag:/, "")))).length;
  const ctx = { rsvps, password, updateRsvp, onNotice, reloadPortal };

  return (
    <>
      <Head title="Court & events" sub="Who has a part in the program, and what's happening all weekend." />
      <div className="ad-grid2">
        <section className="ad-card">
          <div className="ad-between"><h2>Court &amp; padrinos</h2><button type="button" className="ad-btn small" onClick={() => setEditRole("new")}><Icon name="plus" size={14} />Add a role</button></div>
          <span className="ad-muted ad-small">{court.length ? `${ok} of ${court.length} confirmed for rehearsal` : "No roles yet."}</span>
          <ul className="ad-list">
            {editRole === "new" && <li style={{ display: "block" }}><RoleForm {...ctx} pickGuest onDone={() => setEditRole(null)} /></li>}
            {court.map((r) => (
              <li key={r.id}>
                <span className="ad-avatar" aria-hidden="true">{initials(r.full_name)}</span>
                <div className="ad-field" style={{ gap: 0 }}><strong>{r.full_name}</strong><span className="ad-muted ad-small">{r.role_title}{r.role_moment ? ` · ${r.role_moment}` : ""}</span></div>
                <span className={`ad-pill ${r.rehearsal_confirmed ? "ok" : "warn"}`}>{r.rehearsal_confirmed ? "Confirmed" : "Not yet"}</span>
                <button type="button" className="ad-icon-btn" aria-label={`Edit ${r.full_name}`} onClick={() => setEditRole(editRole === r.id ? null : r.id)}><Icon name="edit" size={16} /></button>
                {editRole === r.id && <RoleForm {...ctx} initial={r} onDone={() => setEditRole(null)} />}
              </li>
            ))}
          </ul>
        </section>

        <section className="ad-card">
          <div className="ad-between"><h2>Weekend events</h2><button type="button" className="ad-btn small" onClick={() => setEditEvent("new")}><Icon name="plus" size={14} />Add event</button></div>
          <span className="ad-muted ad-small">Each one shows only on the pages of the guests you invite.</span>
          <ul className="ad-list ad-events">
            {editEvent === "new" && <li style={{ display: "block" }}><EventForm tags={tags} {...ctx} onDone={() => setEditEvent(null)} /></li>}
            {(portal?.events || []).length === 0 && editEvent !== "new" && <li style={{ display: "block" }}><p className="ad-muted">No events yet — add the rehearsal, welcome dinner, misa…</p></li>}
            {(portal?.events || []).map((e) => {
              const d = new Date(`${e.event_date}T12:00:00Z`);
              return (
                <li key={e.id}>
                  <div className="ad-date"><span>{d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}</span><strong>{d.getUTCDate()}</strong></div>
                  <div className="ad-field" style={{ gap: 0 }}><strong>{e.title_es}</strong><span className="ad-muted ad-small">{fmtDate(e.event_date)}{e.event_time ? ` · ${fmtTime(e.event_time)}` : ""} · {e.audience === "all" ? "Everyone" : `Group: ${e.audience.replace(/^tag:/, "")}`}</span></div>
                  <span className="ad-small" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{e.ask_rsvp ? `${going(e.id)} / ${invited(e)} going` : ""}</span>
                  <button type="button" className="ad-icon-btn" aria-label={`Edit ${e.title_es}`} onClick={() => setEditEvent(editEvent === e.id ? null : e.id)}><Icon name="edit" size={16} /></button>
                  {editEvent === e.id && <EventForm initial={e} tags={tags} {...ctx} onDone={() => setEditEvent(null)} />}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}

/* ---------- Meals ---------- */
function Meals({ rsvps, portal, go }) {
  const confirmed = rsvps.filter((r) => isYes(r.attending));
  const options = portal?.settings?.event?.meal_options || [];
  const counts = {};
  let kids = 0;
  const allergies = [];
  const unpicked = [];
  confirmed.forEach((r) => {
    const meals = Array.isArray(r.meals) ? r.meals : [];
    if (!meals.some((m) => m.meal)) unpicked.push(r);
    meals.forEach((m) => {
      if (m.meal) counts[m.meal] = (counts[m.meal] || 0) + 1;
      if (m.kid) kids++;
    });
    if (r.allergies) allergies.push([r.full_name, r.allergies, r.table_number]);
  });

  function download() {
    const rows = [["Party", "Table", "Person", "Meal", "Kids table", "Allergies"]];
    confirmed.forEach((r) => (Array.isArray(r.meals) && r.meals.length ? r.meals : [{ name: "", meal: "", kid: false }]).forEach((m) => rows.push([r.full_name, r.table_number || "", m.name, m.meal, m.kid ? "Yes" : "", r.allergies || ""])));
    const csv = rows.map((row) => row.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "lucys-quince-meals.csv";
    a.click();
  }

  return (
    <>
      <Head title="Meals" sub="What everyone picked, for the caterer." right={<button type="button" className="ad-btn" onClick={download}><Icon name="download" size={16} />Download for the caterer</button>} />
      {!options.length && <div className="ad-notice">Guests can't pick meals until you add options. <button type="button" className="ad-link" onClick={() => go("event")}>Add meal options in Event info</button></div>}
      <div className="ad-stats" style={{ gridTemplateColumns: `repeat(${Math.min(6, Object.keys(counts).length + 2)}, minmax(0, 1fr))` }}>
        {Object.entries(counts).map(([m, n]) => <div key={m} className="ad-stat pink"><strong>{n}</strong><span>{m}</span></div>)}
        <div className="ad-stat"><strong>{kids}</strong><span>Kids' table</span></div>
        <div className="ad-stat"><strong>{unpicked.length}</strong><span>parties haven't picked</span></div>
      </div>
      <div className="ad-grid2">
        <section className="ad-card">
          <h2>Allergies</h2>
          {allergies.length === 0 ? <p className="ad-muted">None noted yet.</p> : (
            <ul className="ad-list">{allergies.map(([n, a, t]) => <li key={n} style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}><div className="ad-field" style={{ gap: 0 }}><strong>{n}</strong><span className="ad-muted ad-small">{a}</span></div><span className="ad-pill pink">{t ? `Table ${t}` : "No table"}</span></li>)}</ul>
          )}
        </section>
        <section className="ad-card">
          <h2>Haven't picked yet</h2>
          {unpicked.length === 0 ? <div className="ad-ok"><Icon name="check" size={18} />Everyone confirmed has picked.</div> : (
            <ul className="ad-list">{unpicked.map((r) => <li key={r.id} style={{ gridTemplateColumns: "40px minmax(0,1fr) auto" }}><span className="ad-avatar" aria-hidden="true">{initials(r.full_name)}</span><div className="ad-field" style={{ gap: 0 }}><strong>{r.full_name}</strong><span className="ad-muted ad-small">{r.guest_count} {r.guest_count === 1 ? "guest" : "guests"}</span></div><span className="ad-pill gray">{r.table_number ? `Table ${r.table_number}` : "—"}</span></li>)}</ul>
          )}
          {unpicked.length > 0 && <p className="ad-muted ad-small">Remind them with a text from the SMS tab or an announcement in Arrivals.</p>}
        </section>
      </div>
    </>
  );
}

/* ---------- Party extras ---------- */
function Party({ portal, password, reloadPortal, onNotice }) {
  const [busy, run] = useRunner(onNotice);
  const [printing, setPrinting] = useState(null);
  const start = (kind) => { setPrinting(kind); document.body.classList.add("pa-printing"); };
  const stop = () => { setPrinting(null); document.body.classList.remove("pa-printing"); };
  const songs = portal?.songs || [];
  const wishes = portal?.wishes || [];
  const photos = portal?.photos || [];

  return (
    <>
      <Head title="Party extras" sub="Song requests, wishes for Lucy, and photos from the tables." />
      {printing && (
        <div className="pa-print">
          <div className="ad-row pa-print-tools" style={{ marginBottom: 16 }}>
            <button type="button" className="ad-btn" onClick={() => window.print()}>Print</button>
            <button type="button" className="ad-btn ghost" onClick={stop}>Close</button>
          </div>
          {printing === "qr" && (
            <div className="pa-qrcards">
              {(portal?.tableCards || []).map((c) => (
                <div key={c.label} className="pa-qrcard">
                  <img src="/logo.png" alt="Lucy's Quinceañera" />
                  <h4>Mesa {c.label}</h4>
                  <QR text={c.url} size={170} label={`Photo upload code for table ${c.label}`} />
                  <p>Escanea para compartir tus fotos y videos<br />Scan to share your photos &amp; videos</p>
                </div>
              ))}
            </div>
          )}
          {printing === "wishes" && (
            <div className="pa-keepsake">
              <img src="/logo.png" alt="Lucy's Quinceañera" style={{ width: 320, display: "block", margin: "0 auto 12px" }} />
              <h2 style={{ textAlign: "center", fontWeight: 400 }}>Deseos para Lucy</h2>
              {wishes.filter((w) => w.body).slice().reverse().map((w) => <article key={w.id}><p>{w.body}</p><strong>— {w.from_name}</strong></article>)}
            </div>
          )}
        </div>
      )}

      <div className="ad-grid2">
        <section className="ad-card">
          <div className="ad-between"><h2>Song requests</h2><button type="button" className="ad-btn ghost small" onClick={() => copy(portal?.djUrl).then(() => onNotice("DJ link copied."))}>Copy DJ link</button></div>
          <p className="ad-muted ad-small">The DJ link shows only the song list — no guest info. Hide anything you don't want played.</p>
          {songs.length === 0 ? <p className="ad-muted">No requests yet.</p> : (
            <ol className="ad-list">
              {songs.slice(0, 40).map((s, i) => (
                <li key={s.id} style={{ gridTemplateColumns: "28px minmax(0,1fr) auto auto", opacity: s.hidden ? 0.45 : 1 }}>
                  <span className="ad-serif" style={{ color: "#b8005f", fontSize: 18 }}>{i + 1}</span>
                  <div className="ad-field" style={{ gap: 0 }}><strong>{s.title}</strong>{s.artist && <span className="ad-muted ad-small">{s.artist}</span>}</div>
                  <span className="ad-pill pink"><Icon name="heart" size={12} />{s.votes}</span>
                  <button type="button" className="mini-btn" disabled={busy} onClick={() => run(async () => { await portalCall(password, "hide-song", { id: s.id, hidden: !s.hidden }); await reloadPortal(); })}>{s.hidden ? "Show" : "Hide"}</button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="ad-main">
          <section className="ad-card">
            <div className="ad-between"><h2>Wishes for Lucy</h2><span className="ad-pill pink">{wishes.length} · {wishes.filter((w) => w.video_url).length} videos</span></div>
            <p className="ad-muted ad-small">Guests can't see each other's wishes. Share them with Lucy when you're ready.</p>
            <button type="button" className="ad-btn" style={{ alignSelf: "flex-start" }} disabled={!wishes.length} onClick={() => start("wishes")}>Make a keepsake book</button>
            {wishes.length > 0 && (
              <details>
                <summary className="ad-link" style={{ display: "inline-block" }}>Read wishes &amp; watch videos</summary>
                <ul className="ad-list">
                  {wishes.map((w) => (
                    <li key={w.id} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                      <div className="ad-between"><strong>{w.from_name}</strong><span className="ad-muted ad-small">{when(w.created_at)}</span></div>
                      {w.body && <p style={{ whiteSpace: "pre-line" }}>{w.body}</p>}
                      {w.video_url && <><video src={w.video_url} controls playsInline style={{ width: "100%", maxHeight: 280, borderRadius: 12 }} /><a href={w.video_url} download className="ad-small">Download video</a></>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="ad-card">
            <div className="ad-between"><h2>Photos</h2><span className="ad-pill pink">{photos.length}</span></div>
            <p className="ad-muted ad-small">Print one QR card per table — guests scan it to add photos and videos, no sign-in needed.</p>
            <button type="button" className="ad-btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => start("qr")}><Icon name="printer" size={16} />Print table QR cards</button>
            {photos.length > 0 && (
              <div className="pa-photos">
                {photos.slice(0, 60).map((p) => (
                  <figure key={p.id} className={p.hidden ? "hidden" : ""}>
                    {String(p.content_type || "").startsWith("video/") ? <video src={p.url} muted playsInline preload="metadata" /> : <a href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt={`Table ${p.table_label || ""}`} loading="lazy" /></a>}
                    <figcaption><span>{p.table_label ? `Table ${p.table_label}` : ""}</span><button type="button" className="mini-btn" onClick={() => run(async () => { await portalCall(password, "hide-photo", { id: p.id, hidden: !p.hidden }); await reloadPortal(); })}>{p.hidden ? "Show" : "Hide"}</button></figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
