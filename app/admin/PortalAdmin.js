"use client";
// Admin pieces for the personal guest pages: links, per-guest page fields, Arrivals, Program and Inbox tabs.
import { useMemo, useState } from "react";
import { QR } from "../guest/ui";
import { LINK_TEXT_PRESETS, DEFAULT_LINK_TEXT, renderLinkText, smsSegments, daysUntil } from "../../lib/link-text";

export function isYes(v) {
  const s = String(v || "").toLowerCase();
  return s.includes("si") || s.includes("sí") || s.includes("yes");
}

export async function portalCall(password, action, payload = {}) {
  const res = await fetch("/api/admin/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action, ...payload }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "Request failed");
  return data;
}

const fmtTime = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
  if (!m) return t || "";
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};
const fmtDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || "")) ? new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : d || "");
const when = (v) => (v ? new Date(v).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

export function linkFor(siteUrl, r) {
  return r?.access_token ? `${siteUrl || (typeof window !== "undefined" ? window.location.origin : "")}/g/${r.access_token}` : "";
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copy this link:", text);
    return false;
  }
}

/* ---------- Link cell in the guest table ---------- */
export function LinkCell({ r, portal, password, onNotice }) {
  const [busy, setBusy] = useState(false);
  if (!r.access_token) return <span className="pa-muted">Run the SQL setup</span>;
  const url = linkFor(portal?.siteUrl, r);
  return (
    <div className="pa-row" style={{ gap: 4 }}>
      <button type="button" className="mini-btn" onClick={async () => { await copy(url); onNotice(`Link for ${r.full_name} copied.`); }}>Copy link</button>
      <button type="button" className="mini-btn" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          const d = await portalCall(password, "text-links", { ids: [r.id] });
          onNotice(d.submitted ? `Texted ${r.full_name} their link.` : `Not texted: ${d.notes?.[0] || "already texted this link, or no SMS opt-in"}.`);
        } catch (e) {
          onNotice(e.message);
        } finally {
          setBusy(false);
        }
      }}>Text it</button>
      <small className="pa-muted" style={{ width: "100%", fontSize: 12 }}>{r.last_opened_at ? `Opened ${when(r.last_opened_at)}` : "Never opened"}</small>
    </div>
  );
}

/* ---------- Guest page section inside the Edit RSVP modal ---------- */
export function GuestPageEditor({ rsvp, portal, password, onSaved, onNotice: notifyParent }) {
  const [note, setNote] = useState("");
  const onNotice = (m) => {
    setNote(m);
    notifyParent(m);
  };
  const [f, setF] = useState({
    table_note: rsvp.table_note || "",
    personal_note: rsvp.personal_note || "",
    role_title: rsvp.role_title || "",
    role_moment: rsvp.role_moment || "",
    role_details: rsvp.role_details || "",
    rehearsal_confirmed: Boolean(rsvp.rehearsal_confirmed),
    guest_tags: (rsvp.guest_tags || []).join(", "),
    shuttle_id: rsvp.shuttle_id || "",
  });
  const [busy, setBusy] = useState(false);
  const url = linkFor(portal?.siteUrl, rsvp);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function save() {
    setBusy(true);
    try {
      const d = await portalCall(password, "save-guest", { id: rsvp.id, fields: f });
      onSaved(d.rsvp);
      onNotice("Guest page saved.");
    } catch (e) {
      onNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!confirm(`Make a new link for ${rsvp.full_name}? The old link stops working and any phone using it is signed out.`)) return;
    setBusy(true);
    try {
      const d = await portalCall(password, "reset-link", { id: rsvp.id });
      onSaved(d.rsvp);
      onNotice("New link created. Text or copy it to send it.");
    } catch (e) {
      onNotice(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pa-card" style={{ marginTop: 16 }}>
      <h3>Guest page</h3>
      <div className="pa-field"><label>Table note (guest sees it)</label><input value={f.table_note} onChange={set("table_note")} placeholder="Near the dance floor. With Familia Hernández." /></div>
      <div className="pa-field"><label>Personal note on their page</label><textarea rows={3} value={f.personal_note} onChange={set("personal_note")} /></div>
      <div className="pa-grid2">
        <div className="pa-field"><label>Role</label><input value={f.role_title} onChange={set("role_title")} placeholder="Madrina de pastel" /></div>
        <div className="pa-field"><label>Their moment</label><input value={f.role_moment} onChange={set("role_moment")} placeholder="9:20 PM — line up by the stage" /></div>
      </div>
      <div className="pa-field"><label>Their part (one step per line)</label><textarea rows={3} value={f.role_details} onChange={set("role_details")} /></div>
      <div className="pa-grid2">
        <div className="pa-field"><label>Groups (comma separated)</label><input value={f.guest_tags} onChange={set("guest_tags")} placeholder="court, padrinos, family" /></div>
        <div className="pa-field"><label>Shuttle</label>
          <select value={f.shuttle_id} onChange={set("shuttle_id")}>
            <option value="">None</option>
            {(portal?.shuttles || []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <label className="pa-row" style={{ fontSize: 14 }}><input type="checkbox" checked={f.rehearsal_confirmed} onChange={set("rehearsal_confirmed")} /> Confirmed for rehearsal</label>
      {(rsvp.flight_number || rsvp.hotel) && (
        <p className="pa-muted">Flying {rsvp.flight_number || "—"}{rsvp.landing_date ? ` · lands ${fmtDate(rsvp.landing_date)} ${fmtTime(rsvp.landing_time)}` : ""} · Staying at {rsvp.hotel || "—"}{rsvp.arrive_date ? ` (${rsvp.arrive_date} → ${rsvp.depart_date || "?"})` : ""}</p>
      )}
      <div className="pa-field">
        <label>Personal link</label>
        <code style={{ fontSize: 12, background: "#f8f1f4", padding: "8px 10px", borderRadius: 8, overflowWrap: "anywhere" }}>{url || "—"}</code>
      </div>
      <div className="pa-row">
        <button type="button" className="pa-btn" disabled={busy} onClick={save}>Save guest page</button>
        {url && <button type="button" className="pa-btn ghost" onClick={() => copy(url).then(() => onNotice("Link copied."))}>Copy link</button>}
        {url && <a className="pa-btn ghost" href={url} target="_blank" rel="noopener noreferrer" title="This signs THIS browser in as the guest">Preview as them</a>}
        <button type="button" className="pa-btn danger" disabled={busy} onClick={reset}>Reset link</button>
      </div>
      {note && <div className="message" role="status" style={{ margin: 0 }}>{note}</div>}
      <p className="pa-muted" style={{ fontSize: 12 }}>Preview signs this browser in as the guest. Use the sign-out button on their page afterward.</p>
    </div>
  );
}

/* ---------- Arrivals tab ---------- */
export function ArrivalsPanel({ rsvps, portal, password, reloadPortal, updateRsvp, onNotice }) {
  const confirmed = rsvps.filter((r) => isYes(r.attending));
  const withFlight = confirmed.filter((r) => r.landing_date).sort((a, b) => `${a.landing_date} ${a.landing_time || ""}`.localeCompare(`${b.landing_date} ${b.landing_time || ""}`));
  const noFlight = confirmed.filter((r) => !r.landing_date);
  const byDate = withFlight.reduce((m, r) => ((m[r.landing_date] = m[r.landing_date] || []).push(r), m), {});
  const shuttles = portal?.shuttles || [];
  const seats = (id) => rsvps.filter((r) => r.shuttle_id === id).reduce((n, r) => n + Number(r.guest_count || 0), 0);
  const [draft, setDraft] = useState({ label: "", depart_date: "", depart_time: "", from_place: "PVR airport", to_place: "Guayabitos hotels", seats: 14, notes: "" });
  const [ann, setAnn] = useState({ body: "", audience: "confirmed" });
  const [busy, setBusy] = useState(false);
  const hotels = [...new Set(rsvps.map((r) => r.hotel).filter(Boolean))];
  const tags = [...new Set(rsvps.flatMap((r) => r.guest_tags || []))];
  const tables = [...new Set(rsvps.map((r) => r.table_number).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onNotice(e.message);
    } finally {
      setBusy(false);
    }
  };

  const audienceLabel = (a) => a === "all" ? "Everyone" : a === "confirmed" ? "Everyone confirmed" : a.replace(/^tag:/, "Group: ").replace(/^hotel:/, "Hotel: ").replace(/^table:/, "Table ");

  return (
    <div className="pa">
      <section className="pa-card">
        <div className="pa-row" style={{ justifyContent: "space-between" }}>
          <h3>Arrivals at PVR</h3>
          <div className="pa-row">
            {Object.entries(byDate).map(([d, list]) => <span key={d} className="pa-pill">{fmtDate(d)} · {list.reduce((n, r) => n + Number(r.guest_count || 0), 0)} people</span>)}
            <span className="pa-pill gray">No flight yet · {noFlight.length} parties</span>
          </div>
        </div>
        {withFlight.length === 0 ? <p className="pa-muted">No flights added yet. Guests add them on their Travel tab.</p> : (
          <div className="pa-scroll">
            <table className="pa-table" style={{ minWidth: 760 }}>
              <thead><tr><th>Lands</th><th>Party</th><th>Flight / from</th><th>Staying at</th><th>Ride</th></tr></thead>
              <tbody>
                {withFlight.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{fmtDate(r.landing_date)}</strong><br />{fmtTime(r.landing_time)}</td>
                    <td>{r.full_name} · {r.guest_count}</td>
                    <td>{r.flight_number || "—"}<br /><span className="pa-muted">{r.travel_from}</span></td>
                    <td>{r.hotel || "—"}{r.arrive_date ? <><br /><span className="pa-muted">{r.arrive_date} → {r.depart_date}</span></> : null}</td>
                    <td>
                      <select value={r.shuttle_id || ""} onChange={(e) => run(async () => { const d = await portalCall(password, "save-guest", { id: r.id, fields: { shuttle_id: e.target.value } }); updateRsvp(d.rsvp); })} aria-label={`Shuttle for ${r.full_name}`}>
                        <option value="">{r.ride_share_ok ? "Open to sharing" : "No shuttle"}</option>
                        {shuttles.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="pa-grid">
        <section className="pa-card">
          <h3>Shuttles</h3>
          {shuttles.map((s) => (
            <div key={s.id} className="pa-row" style={{ justifyContent: "space-between", borderTop: "1px solid #f6e3ec", paddingTop: 8 }}>
              <div>
                <strong>{s.label}</strong> · {fmtDate(s.depart_date)} {fmtTime(s.depart_time)}
                <div className="pa-muted">{[s.from_place, s.to_place].filter(Boolean).join(" → ")} · {seats(s.id)} of {s.seats} seats</div>
              </div>
              <button type="button" className="pa-btn danger" disabled={busy} onClick={() => confirm(`Delete ${s.label}? Guests on it will be unassigned.`) && run(async () => { await portalCall(password, "delete-shuttle", { id: s.id }); await reloadPortal(true); })}>Delete</button>
            </div>
          ))}
          <form className="pa" style={{ marginTop: 0, gap: 10 }} onSubmit={(e) => { e.preventDefault(); run(async () => { await portalCall(password, "save-shuttle", { shuttle: draft }); setDraft({ ...draft, label: "" }); await reloadPortal(); onNotice("Shuttle added. Guests can now save seats on their Travel tab."); }); }}>
            <div className="pa-grid2">
              <div className="pa-field"><label>Name</label><input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Shuttle 1" required /></div>
              <div className="pa-field"><label>Seats</label><input type="number" min="1" value={draft.seats} onChange={(e) => setDraft({ ...draft, seats: e.target.value })} /></div>
              <div className="pa-field"><label>Date</label><input type="date" value={draft.depart_date} onChange={(e) => setDraft({ ...draft, depart_date: e.target.value })} /></div>
              <div className="pa-field"><label>Leaves at</label><input type="time" value={draft.depart_time} onChange={(e) => setDraft({ ...draft, depart_time: e.target.value })} /></div>
              <div className="pa-field"><label>From</label><input value={draft.from_place} onChange={(e) => setDraft({ ...draft, from_place: e.target.value })} /></div>
              <div className="pa-field"><label>To</label><input value={draft.to_place} onChange={(e) => setDraft({ ...draft, to_place: e.target.value })} /></div>
            </div>
            <button className="pa-btn ghost" type="submit" disabled={busy}>+ Add shuttle</button>
          </form>
        </section>

        <section className="pa-card">
          <h3>Post an announcement</h3>
          <form className="pa" style={{ marginTop: 0, gap: 10 }} onSubmit={(e) => { e.preventDefault(); run(async () => { await portalCall(password, "post-announcement", ann); setAnn({ ...ann, body: "" }); await reloadPortal(); onNotice("Posted to guest pages."); }); }}>
            <div className="pa-field"><label>Message</label><textarea rows={4} value={ann.body} onChange={(e) => setAnn({ ...ann, body: e.target.value })} required /></div>
            <div className="pa-field"><label>Who sees it</label>
              <select value={ann.audience} onChange={(e) => setAnn({ ...ann, audience: e.target.value })}>
                <option value="all">Everyone (with a page)</option>
                <option value="confirmed">Everyone confirmed</option>
                {tags.map((t) => <option key={t} value={`tag:${t}`}>Group: {t}</option>)}
                {hotels.map((h) => <option key={h} value={`hotel:${h}`}>Staying at {h}</option>)}
                {tables.map((t) => <option key={t} value={`table:${t}`}>Table {t}</option>)}
              </select>
            </div>
            <button className="pa-btn" type="submit" disabled={busy}>Post to guest pages</button>
          </form>
          <div style={{ borderTop: "1px solid #f0d6e2", paddingTop: 10 }} className="pa">
            {(portal?.announcements || []).map((a) => (
              <div key={a.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <p style={{ margin: 0 }}><strong>{when(a.created_at)}</strong> · {a.body} <span className="pa-muted">({audienceLabel(a.audience)})</span></p>
                <div className="pa-row">
                  <button type="button" className="mini-btn" disabled={busy || !portal?.smsReady} title={portal?.smsReady ? "" : "Texting isn't set up"} onClick={() => run(async () => { const d = await portalCall(password, "text-announcement", { id: a.id }); onNotice(d.note); })}>Also text it</button>
                  <button type="button" className="mini-btn danger" disabled={busy} onClick={() => confirm("Remove this announcement from guest pages?") && run(async () => { await portalCall(password, "delete-announcement", { id: a.id }); await reloadPortal(); })}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Inbox tab ---------- */
export function InboxPanel({ rsvps, portal, password, reloadPortal, onNotice }) {
  const messages = portal?.messages || [];
  const byGuest = useMemo(() => {
    const m = {};
    messages.forEach((x) => (m[x.rsvp_id] = m[x.rsvp_id] || []).push(x));
    return Object.entries(m)
      .map(([id, list]) => ({ id, list: list.sort((a, b) => a.created_at.localeCompare(b.created_at)), unread: list.some((x) => x.sender === "guest" && !x.read_by_family_at), last: list.reduce((a, b) => (a.created_at > b.created_at ? a : b)) }))
      .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [messages]);
  const [openId, setOpenId] = useState(null);
  const [reply, setReply] = useState("");
  const [textToo, setTextToo] = useState(true);
  const [busy, setBusy] = useState(false);
  const current = byGuest.find((g) => g.id === openId) || byGuest[0];
  const nameOf = (id) => rsvps.find((r) => r.id === id)?.full_name || "Guest";
  const catLabel = { question: "Question", song: "Song", note: "Note for Lucy" };

  if (!byGuest.length) return <div className="pa"><section className="pa-card"><h3>Messages from guests</h3><p className="pa-muted">No messages yet. Guests write to you from the Messages tab on their page.</p></section></div>;

  return (
    <div className="pa">
      <section className="pa-card">
        <h3>Messages from guests</h3>
        <div className="pa-inbox">
          <div className="pa-inbox-list">
            {byGuest.map((g) => (
              <button key={g.id} type="button" className={`${current?.id === g.id ? "on" : ""} ${g.unread ? "unread" : ""}`} onClick={() => { setOpenId(g.id); if (g.unread) portalCall(password, "mark-read", { rsvp_id: g.id }).then(() => reloadPortal()).catch(() => {}); }}>
                <strong>{nameOf(g.id)}</strong>
                <span className="pa-muted" style={{ fontSize: 12 }}>{g.last.body.slice(0, 60)}</span>
              </button>
            ))}
          </div>
          {current && (
            <div className="pa" style={{ marginTop: 0 }}>
              <strong>{nameOf(current.id)}</strong>
              <div className="pa-thread">
                {current.list.map((m) => (
                  <div key={m.id} className={`pa-msg ${m.sender}`}>
                    {m.body}
                    <small>{m.sender === "guest" ? catLabel[m.category] || "Message" : "You"} · {when(m.created_at)}</small>
                  </div>
                ))}
              </div>
              <form className="pa" style={{ marginTop: 0, gap: 8 }} onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const d = await portalCall(password, "reply", { rsvp_id: current.id, body: reply, text: textToo && portal?.smsReady });
                  setReply("");
                  onNotice(`Reply sent. ${d.note || ""}`);
                  await reloadPortal();
                } catch (err) {
                  onNotice(err.message);
                } finally {
                  setBusy(false);
                }
              }}>
                <div className="pa-field"><label>Reply</label><textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} required /></div>
                <label className="pa-row" style={{ fontSize: 14 }}><input type="checkbox" checked={textToo} disabled={!portal?.smsReady} onChange={(e) => setTextToo(e.target.checked)} /> Text them a heads-up (only if they opted in)</label>
                <button className="pa-btn" type="submit" disabled={busy}>Send reply</button>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- Program tab ---------- */
export function ProgramPanel({ rsvps, portal, password, reloadPortal, updateRsvp, onNotice }) {
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(null); // 'qr' | 'wishes'
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onNotice(e.message);
    } finally {
      setBusy(false);
    }
  };
  const ev = portal?.settings?.event || {};
  const [eventForm, setEventForm] = useState({ ...ev, meal_options_text: (ev.meal_options || []).join("\n") });
  const [mode, setMode] = useState(portal?.settings?.mode || {});
  const [schedule, setSchedule] = useState(portal?.settings?.schedule || []);
  const blankEvent = { title_es: "", title_en: "", event_date: "", event_time: "", duration_minutes: 120, location: "", maps_url: "", audience: "all", ask_rsvp: false };
  const [evDraft, setEvDraft] = useState(blankEvent);
  const [roleGuest, setRoleGuest] = useState("");
  const [roleDraft, setRoleDraft] = useState({ role_title: "", role_moment: "", role_details: "", guest_tags: "court" });

  const confirmed = rsvps.filter((r) => isYes(r.attending));
  const court = rsvps.filter((r) => r.role_title);
  const tags = [...new Set(rsvps.flatMap((r) => r.guest_tags || []))];

  // meals summary
  const mealCounts = {};
  let kids = 0;
  const allergies = [];
  let unpicked = 0;
  confirmed.forEach((r) => {
    const meals = Array.isArray(r.meals) ? r.meals : [];
    if (!meals.length) unpicked++;
    meals.forEach((m) => {
      if (m.meal) mealCounts[m.meal] = (mealCounts[m.meal] || 0) + 1;
      if (m.kid) kids++;
    });
    if (r.allergies) allergies.push(`${r.full_name}: ${r.allergies}`);
  });

  function downloadMeals() {
    const rows = [["Party", "Table", "Person", "Meal", "Kids table", "Allergies"]];
    confirmed.forEach((r) => (Array.isArray(r.meals) && r.meals.length ? r.meals : [{ name: "", meal: "", kid: false }]).forEach((m) => rows.push([r.full_name, r.table_number || "", m.name, m.meal, m.kid ? "Yes" : "", r.allergies || ""])));
    const csv = rows.map((row) => row.map((c) => `"${String(c ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "lucys-quince-meals.csv";
    a.click();
  }

  const going = (id) => (portal?.eventRsvps || []).filter((x) => x.event_id === id);
  const invitedCount = (e) => rsvps.filter((r) => e.audience === "all" ? isYes(r.attending) : (r.guest_tags || []).includes(e.audience.replace(/^tag:/, ""))).length;

  const startPrint = (kind) => {
    setPrinting(kind);
    document.body.classList.add("pa-printing");
  };
  const stopPrint = () => {
    setPrinting(null);
    document.body.classList.remove("pa-printing");
  };

  return (
    <div className="pa">
      {printing && (
        <div className="pa-print">
          <div className="pa-row pa-print-tools" style={{ marginBottom: 16 }}>
            <button type="button" className="pa-btn" onClick={() => window.print()}>Print</button>
            <button type="button" className="pa-btn ghost" onClick={stopPrint}>Close</button>
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
              {(portal?.wishes || []).filter((w) => w.body).slice().reverse().map((w) => (
                <article key={w.id}><p>{w.body}</p><strong>— {w.from_name}</strong></article>
              ))}
            </div>
          )}
        </div>
      )}

      <LinkTextCard rsvps={rsvps} portal={portal} password={password} reloadPortal={reloadPortal} onNotice={onNotice} />
      <div className="pa-grid">
        <section className="pa-card">
          <h3>Event details</h3>
          <p className="pa-muted">Shown on every guest page.</p>
          <div className="pa-field"><label>Venue name</label><input value={eventForm.venue_name || ""} onChange={(e) => setEventForm({ ...eventForm, venue_name: e.target.value })} /></div>
          <div className="pa-field"><label>Venue address</label><input value={eventForm.venue_address || ""} onChange={(e) => setEventForm({ ...eventForm, venue_address: e.target.value })} /></div>
          <div className="pa-field"><label>Google Maps link</label><input value={eventForm.maps_url || ""} onChange={(e) => setEventForm({ ...eventForm, maps_url: e.target.value })} placeholder="https://maps.app.goo.gl/…" /></div>
          <div className="pa-grid2">
            <div className="pa-field"><label>Dress code (ES)</label><input value={eventForm.dress_code_es || ""} onChange={(e) => setEventForm({ ...eventForm, dress_code_es: e.target.value })} /></div>
            <div className="pa-field"><label>Dress code (EN)</label><input value={eventForm.dress_code_en || ""} onChange={(e) => setEventForm({ ...eventForm, dress_code_en: e.target.value })} /></div>
            <div className="pa-field"><label>Court color</label><input value={eventForm.court_color || ""} onChange={(e) => setEventForm({ ...eventForm, court_color: e.target.value })} placeholder="rosa / blush pink" /></div>
            <div className="pa-field"><label>RSVP deadline (as text)</label><input value={eventForm.rsvp_deadline || ""} onChange={(e) => setEventForm({ ...eventForm, rsvp_deadline: e.target.value })} placeholder="15 de diciembre" /></div>
            <div className="pa-field"><label>Meal deadline (as text)</label><input value={eventForm.meal_deadline || ""} onChange={(e) => setEventForm({ ...eventForm, meal_deadline: e.target.value })} /></div>
            <div className="pa-field"><label>Gifts link</label><input value={eventForm.gifts_url || ""} onChange={(e) => setEventForm({ ...eventForm, gifts_url: e.target.value })} placeholder="https://lucysquinceanera.com/gifts" /></div>
          </div>
          <div className="pa-field"><label>Meal options (one per line — leave empty to hide meal choice)</label><textarea rows={3} value={eventForm.meal_options_text || ""} onChange={(e) => setEventForm({ ...eventForm, meal_options_text: e.target.value })} /></div>
          <div className="pa-grid2">
            <div className="pa-field"><label>Thank-you note from Lucy (ES)</label><textarea rows={4} value={eventForm.thank_you_es || ""} onChange={(e) => setEventForm({ ...eventForm, thank_you_es: e.target.value })} /></div>
            <div className="pa-field"><label>Thank-you note (EN)</label><textarea rows={4} value={eventForm.thank_you_en || ""} onChange={(e) => setEventForm({ ...eventForm, thank_you_en: e.target.value })} /></div>
          </div>
          <button type="button" className="pa-btn" disabled={busy} onClick={() => run(async () => {
            const { meal_options_text, ...rest } = eventForm;
            await portalCall(password, "save-settings", { key: "event", value: { ...rest, meal_options: String(meal_options_text || "").split("\n").map((s) => s.trim()).filter(Boolean) } });
            await reloadPortal();
            onNotice("Event details saved.");
          })}>Save event details</button>
        </section>

        <section className="pa-card">
          <h3>The night-of schedule</h3>
          <p className="pa-muted">Drives the “Now / Next” card on the day of the party.</p>
          {schedule.map((s, i) => (
            <div key={i} className="pa-grid3" style={{ gridTemplateColumns: "110px 1fr 1fr auto" }}>
              <input type="time" aria-label="Time" value={s.time} onChange={(e) => setSchedule(schedule.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
              <input aria-label="Spanish" value={s.es} onChange={(e) => setSchedule(schedule.map((x, j) => (j === i ? { ...x, es: e.target.value } : x)))} />
              <input aria-label="English" value={s.en} onChange={(e) => setSchedule(schedule.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)))} />
              <button type="button" className="mini-btn danger" aria-label="Remove" onClick={() => setSchedule(schedule.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <div className="pa-row">
            <button type="button" className="pa-btn ghost" onClick={() => setSchedule([...schedule, { time: "", es: "", en: "" }])}>+ Add line</button>
            <button type="button" className="pa-btn" disabled={busy} onClick={() => run(async () => { await portalCall(password, "save-settings", { key: "schedule", value: schedule.filter((s) => s.time && s.es).sort((a, b) => a.time.localeCompare(b.time)) }); await reloadPortal(); onNotice("Schedule saved."); })}>Save schedule</button>
          </div>
          <h3 style={{ marginTop: 12 }}>Page mode</h3>
          <div className="pa-grid2">
            <div className="pa-field"><label>“Tonight” mode starts</label><input type="date" value={mode.tonight_date || ""} onChange={(e) => setMode({ ...mode, tonight_date: e.target.value })} /></div>
            <div className="pa-field"><label>Thank-you page starts</label><input type="date" value={mode.after_date || ""} onChange={(e) => setMode({ ...mode, after_date: e.target.value })} /></div>
          </div>
          <div className="pa-field"><label>Override (for testing)</label>
            <select value={mode.force || ""} onChange={(e) => setMode({ ...mode, force: e.target.value })}>
              <option value="">Automatic by date (now: {portal?.mode})</option>
              <option value="pre">Always before-party page</option>
              <option value="tonight">Always “Tonight”</option>
              <option value="after">Always thank-you page</option>
            </select>
          </div>
          <button type="button" className="pa-btn" disabled={busy} onClick={() => run(async () => { await portalCall(password, "save-settings", { key: "mode", value: mode }); await reloadPortal(); onNotice("Page mode saved."); })}>Save mode</button>
        </section>
      </div>

      <section className="pa-card">
        <h3>Court &amp; padrinos</h3>
        <div className="pa-scroll">
          <table className="pa-table" style={{ minWidth: 560 }}>
            <thead><tr><th>Guest</th><th>Role</th><th>Moment</th><th>Groups</th><th>Rehearsal</th></tr></thead>
            <tbody>
              {court.length === 0 && <tr><td colSpan={5} className="pa-muted">No roles yet. Assign one below.</td></tr>}
              {court.map((r) => (
                <tr key={r.id}>
                  <td>{r.full_name}</td><td>{r.role_title}</td><td>{r.role_moment}</td><td>{(r.guest_tags || []).join(", ")}</td>
                  <td><span className={`pa-pill ${r.rehearsal_confirmed ? "ok" : "warn"}`}>{r.rehearsal_confirmed ? "Confirmed" : "Not yet"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="pa" style={{ marginTop: 0, gap: 10 }} onSubmit={(e) => { e.preventDefault(); run(async () => { const d = await portalCall(password, "save-guest", { id: roleGuest, fields: roleDraft }); updateRsvp(d.rsvp); setRoleGuest(""); onNotice("Role saved — it shows on their page now."); }); }}>
          <div className="pa-grid2">
            <div className="pa-field"><label>Guest</label>
              <select value={roleGuest} required onChange={(e) => { const r = rsvps.find((x) => x.id === e.target.value); setRoleGuest(e.target.value); if (r) setRoleDraft({ role_title: r.role_title || "", role_moment: r.role_moment || "", role_details: r.role_details || "", guest_tags: (r.guest_tags || ["court"]).join(", ") || "court" }); }}>
                <option value="">Choose…</option>
                {rsvps.slice().sort((a, b) => a.full_name.localeCompare(b.full_name)).map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </div>
            <div className="pa-field"><label>Role</label><input value={roleDraft.role_title} onChange={(e) => setRoleDraft({ ...roleDraft, role_title: e.target.value })} placeholder="Chambelán de honor" /></div>
            <div className="pa-field"><label>Their moment</label><input value={roleDraft.role_moment} onChange={(e) => setRoleDraft({ ...roleDraft, role_moment: e.target.value })} placeholder="9:20 PM — line up by the stage" /></div>
            <div className="pa-field"><label>Groups</label><input value={roleDraft.guest_tags} onChange={(e) => setRoleDraft({ ...roleDraft, guest_tags: e.target.value })} /></div>
          </div>
          <div className="pa-field"><label>Their part (one step per line)</label><textarea rows={3} value={roleDraft.role_details} onChange={(e) => setRoleDraft({ ...roleDraft, role_details: e.target.value })} /></div>
          <button className="pa-btn ghost" type="submit" disabled={busy || !roleGuest}>Save role</button>
        </form>
      </section>

      <section className="pa-card">
        <h3>Events &amp; invites</h3>
        <p className="pa-muted">Events for a group (e.g. <code>tag:court</code>) only show on pages of guests in that group. Add groups in each guest’s Edit → Guest page.</p>
        <div className="pa-scroll">
          <table className="pa-table" style={{ minWidth: 620 }}>
            <thead><tr><th>Event</th><th>When</th><th>Who</th><th>Going</th><th /></tr></thead>
            <tbody>
              {(portal?.events || []).map((e) => {
                const g = going(e.id);
                return (
                  <tr key={e.id}>
                    <td>{e.title_es}{e.title_en ? <><br /><span className="pa-muted">{e.title_en}</span></> : null}</td>
                    <td>{fmtDate(e.event_date)} {fmtTime(e.event_time)}</td>
                    <td>{e.audience === "all" ? "Everyone" : e.audience.replace(/^tag:/, "Group: ")}</td>
                    <td>{e.ask_rsvp ? `${g.filter((x) => x.going).length} / ${invitedCount(e)} parties` : "—"}</td>
                    <td className="pa-row" style={{ gap: 4 }}>
                      <button type="button" className="mini-btn" onClick={() => setEvDraft({ ...blankEvent, ...e, event_time: e.event_time || "" })}>Edit</button>
                      <button type="button" className="mini-btn danger" onClick={() => confirm("Delete this event?") && run(async () => { await portalCall(password, "delete-event", { id: e.id }); await reloadPortal(); })}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <form className="pa" style={{ marginTop: 0, gap: 10 }} onSubmit={(e) => { e.preventDefault(); run(async () => { await portalCall(password, "save-event", { event: evDraft }); setEvDraft(blankEvent); await reloadPortal(); onNotice("Event saved."); }); }}>
          <div className="pa-grid2">
            <div className="pa-field"><label>Name (ES)</label><input value={evDraft.title_es} onChange={(e) => setEvDraft({ ...evDraft, title_es: e.target.value })} required placeholder="Ensayo de la corte" /></div>
            <div className="pa-field"><label>Name (EN)</label><input value={evDraft.title_en || ""} onChange={(e) => setEvDraft({ ...evDraft, title_en: e.target.value })} placeholder="Court rehearsal" /></div>
            <div className="pa-field"><label>Date</label><input type="date" value={evDraft.event_date} onChange={(e) => setEvDraft({ ...evDraft, event_date: e.target.value })} required /></div>
            <div className="pa-field"><label>Time (Guayabitos)</label><input type="time" value={evDraft.event_time || ""} onChange={(e) => setEvDraft({ ...evDraft, event_time: e.target.value })} /></div>
            <div className="pa-field"><label>Place</label><input value={evDraft.location || ""} onChange={(e) => setEvDraft({ ...evDraft, location: e.target.value })} /></div>
            <div className="pa-field"><label>Maps link</label><input value={evDraft.maps_url || ""} onChange={(e) => setEvDraft({ ...evDraft, maps_url: e.target.value })} /></div>
            <div className="pa-field"><label>Who's invited</label>
              <select value={evDraft.audience} onChange={(e) => setEvDraft({ ...evDraft, audience: e.target.value })}>
                <option value="all">Everyone</option>
                {[...new Set([...tags, "court", "padrinos", "family"])].map((t) => <option key={t} value={`tag:${t}`}>Group: {t}</option>)}
              </select>
            </div>
            <div className="pa-field"><label>Length (minutes)</label><input type="number" min="15" value={evDraft.duration_minutes || 120} onChange={(e) => setEvDraft({ ...evDraft, duration_minutes: e.target.value })} /></div>
          </div>
          <label className="pa-row" style={{ fontSize: 14 }}><input type="checkbox" checked={Boolean(evDraft.ask_rsvp)} onChange={(e) => setEvDraft({ ...evDraft, ask_rsvp: e.target.checked })} /> Ask guests “Going / Can't go”</label>
          <div className="pa-row">
            <button className="pa-btn ghost" type="submit" disabled={busy}>{evDraft.id ? "Save event" : "+ Add event"}</button>
            {evDraft.id && <button type="button" className="pa-btn danger" onClick={() => setEvDraft(blankEvent)}>Cancel edit</button>}
          </div>
        </form>
      </section>

      <div className="pa-grid">
        <section className="pa-card">
          <h3>Meals</h3>
          <div className="pa-grid3">
            {Object.entries(mealCounts).map(([meal, n]) => <div key={meal} className="pa-stat"><strong>{n}</strong><span>{meal}</span></div>)}
            <div className="pa-stat"><strong>{kids}</strong><span>Kids' table</span></div>
          </div>
          <p className="pa-muted">{allergies.length} allergies noted · {unpicked} confirmed parties haven't picked yet</p>
          {allergies.length > 0 && <ul className="pa-muted" style={{ margin: 0, paddingLeft: 18 }}>{allergies.slice(0, 12).map((a) => <li key={a}>{a}</li>)}</ul>}
          <button type="button" className="pa-btn ghost" onClick={downloadMeals}>Download for the caterer (CSV)</button>
        </section>

        <section className="pa-card">
          <div className="pa-row" style={{ justifyContent: "space-between" }}>
            <h3>Song requests</h3>
            <button type="button" className="pa-btn ghost" onClick={() => copy(portal?.djUrl).then(() => onNotice("DJ link copied."))}>Copy DJ link</button>
          </div>
          <p className="pa-muted">The DJ link shows only the song list — no guest info.</p>
          <ol style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 6 }}>
            {(portal?.songs || []).slice(0, 30).map((s) => (
              <li key={s.id} style={{ opacity: s.hidden ? 0.45 : 1 }}>
                {s.title}{s.artist ? ` — ${s.artist}` : ""} <span className="pa-muted">· {s.votes}</span>{" "}
                <button type="button" className="mini-btn" onClick={() => run(async () => { await portalCall(password, "hide-song", { id: s.id, hidden: !s.hidden }); await reloadPortal(); })}>{s.hidden ? "Show" : "Hide"}</button>
              </li>
            ))}
          </ol>
        </section>

        <section className="pa-card">
          <h3>Wishes for Lucy</h3>
          <p style={{ margin: 0 }}><strong style={{ fontSize: 30, color: "#b8005f", fontFamily: '"Lucy Recoleta", Georgia, serif', fontWeight: 400 }}>{portal?.wishes?.length || 0}</strong> wishes · {(portal?.wishes || []).filter((w) => w.video_url).length} videos</p>
          <p className="pa-muted">Guests can't see each other's wishes. Share them with Lucy when you're ready.</p>
          <div className="pa-row">
            <button type="button" className="pa-btn" onClick={() => startPrint("wishes")}>Make a keepsake book</button>
          </div>
          <details>
            <summary>Read wishes &amp; watch videos</summary>
            <div className="pa" style={{ gap: 10 }}>
              {(portal?.wishes || []).map((w) => (
                <div key={w.id} style={{ borderTop: "1px solid #f6e3ec", paddingTop: 8 }}>
                  <strong>{w.from_name}</strong> <span className="pa-muted">{when(w.created_at)}</span>
                  {w.body && <p style={{ margin: "4px 0", whiteSpace: "pre-line" }}>{w.body}</p>}
                  {w.video_url && <><video src={w.video_url} controls playsInline style={{ width: "100%", maxHeight: 280, borderRadius: 10 }} /><a href={w.video_url} download>Download video</a></>}
                </div>
              ))}
            </div>
          </details>
        </section>

        <section className="pa-card">
          <h3>Photos</h3>
          <p className="pa-muted">Print one QR card per table — each opens that table's upload page. {portal?.photos?.length || 0} photos so far.</p>
          <div className="pa-row"><button type="button" className="pa-btn ghost" onClick={() => startPrint("qr")}>Print table QR cards</button></div>
          <div className="pa-photos">
            {(portal?.photos || []).slice(0, 60).map((p) => (
              <figure key={p.id} className={p.hidden ? "hidden" : ""}>
                {String(p.content_type || "").startsWith("video/") ? <video src={p.url} muted playsInline preload="metadata" /> : <a href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt={`Table ${p.table_label || ""}`} loading="lazy" /></a>}
                <figcaption><span>{p.table_label ? `T${p.table_label}` : ""}</span><button type="button" className="mini-btn" onClick={() => run(async () => { await portalCall(password, "hide-photo", { id: p.id, hidden: !p.hidden }); await reloadPortal(); })}>{p.hidden ? "Show" : "Hide"}</button></figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>

    </div>
  );
}

/* ---------- Text guests their personal link ---------- */
function canText(r) {
  return isYes(r.attending) && r.sms_opt_in && r.sms_opt_in_at && r.access_token && String(r.phone || "").replace(/\D/g, "").length >= 10;
}

export function LinkTextCard({ rsvps, portal, password, reloadPortal, onNotice }) {
  const saved = portal?.settings?.linkText || DEFAULT_LINK_TEXT;
  const [text, setText] = useState({ es: saved.es, en: saved.en || "" });
  const [round, setRound] = useState("invite-1");
  const [testId, setTestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const eligible = rsvps.filter(canText);
  const sample = rsvps.find((r) => r.id === testId) || eligible[0] || rsvps[0];
  const sampleLink = linkFor(portal?.siteUrl, sample) || `${portal?.siteUrl || ""}/g/${"x".repeat(64)}`;
  const previewEs = renderLinkText(text, { ...sample, preferred_language: "es" }, sampleLink);
  const previewEn = text.en.trim() ? renderLinkText(text, { ...sample, preferred_language: "en" }, sampleLink) : "";
  const segEs = smsSegments(previewEs);
  const segEn = previewEn ? smsSegments(previewEn) : null;
  const missingLink = !/\{\s*link\s*\}/i.test(text.es) || (text.en.trim() && !/\{\s*link\s*\}/i.test(text.en));
  const changed = text.es !== saved.es || text.en !== (saved.en || "");

  const run = async (fn) => {
    setBusy(true);
    setResult("");
    try {
      await fn();
    } catch (e) {
      setResult(e.message);
      onNotice(e.message);
    } finally {
      setBusy(false);
    }
  };
  const send = (extra) => run(async () => {
    const d = await portalCall(password, "text-links", { template: text, round, ...extra });
    setResult(d.note || `Texted ${d.submitted}.`);
    onNotice(d.note || `Texted ${d.submitted}.`);
    reloadPortal();
  });

  return (
    <section className="pa-card">
      <h3>Text guests their personal link</h3>
      <p className="pa-muted">
        Goes to confirmed guests who opted in to texts ({eligible.length} right now), 25 per click. Guests who picked English on their page get the English version; everyone else gets Spanish.
        {portal?.smsReady ? "" : " Texting isn't set up yet (Twilio environment variables are missing)."}
      </p>
      <div className="pa-row">
        <span className="pa-muted">Start from:</span>
        {Object.entries(LINK_TEXT_PRESETS).map(([key, p]) => (
          <button key={key} type="button" className="mini-btn" onClick={() => setText({ es: p.es, en: p.en })}>{p.label}</button>
        ))}
      </div>
      <div className="pa-grid2">
        <div className="pa-field">
          <label htmlFor="lt-es">Message in Spanish</label>
          <textarea id="lt-es" rows={10} value={text.es} onChange={(e) => setText({ ...text, es: e.target.value })} />
        </div>
        <div className="pa-field">
          <label htmlFor="lt-en">Message in English (for guests who chose English)</label>
          <textarea id="lt-en" rows={10} value={text.en} onChange={(e) => setText({ ...text, en: e.target.value })} />
        </div>
      </div>
      <p className="pa-muted" style={{ fontSize: 13 }}>
        Every text automatically starts with <strong>Lucy's Quinceañera:</strong> (it shows in the preview). Fill-ins: <code>{"{nombre}"}</code> first name · <code>{"{dias}"}</code> days until the quince (today: {daysUntil()}) · <code>{"{link}"}</code> their personal link. English can use <code>{"{name}"}</code> and <code>{"{days}"}</code>.
      </p>
      {missingLink && <div className="message" style={{ margin: 0 }}>Add {"{link}"} where their personal link should go.</div>}

      <div className="pa-grid2">
        <div className="pa-field">
          <label>Preview — {sample?.full_name || "guest"}</label>
          <div className="pa-msg" style={{ maxWidth: "100%", background: "#f8f1f4" }}>{previewEs}</div>
          <small className="pa-muted">{segEs.segments} text segments per guest ({segEs.encoding}, {segEs.length} characters)</small>
        </div>
        {previewEn && (
          <div className="pa-field">
            <label>English preview</label>
            <div className="pa-msg" style={{ maxWidth: "100%", background: "#f8f1f4" }}>{previewEn}</div>
            <small className="pa-muted">{segEn.segments} text segments per guest</small>
          </div>
        )}
      </div>
      <p className="pa-muted" style={{ fontSize: 13 }}>
        Twilio bills per segment. Sending the Spanish version to all {eligible.length} eligible guests is about {eligible.length * segEs.segments} segments.
      </p>

      <div className="pa-grid2">
        <div className="pa-field">
          <label htmlFor="lt-test">1. Send a test to one guest (yourself)</label>
          <div className="pa-row">
            <select id="lt-test" value={testId} onChange={(e) => setTestId(e.target.value)} style={{ flex: 1, minWidth: 180 }}>
              <option value="">Choose a guest…</option>
              {rsvps.slice().sort((a, b) => a.full_name.localeCompare(b.full_name)).map((r) => (
                <option key={r.id} value={r.id}>{r.full_name}{canText(r) ? "" : " (can't text: not confirmed or no opt-in)"}</option>
              ))}
            </select>
            <button type="button" className="pa-btn ghost" disabled={busy || !testId || missingLink || !portal?.smsReady} onClick={() => send({ ids: [testId], test: true })}>Send test</button>
          </div>
        </div>
        <div className="pa-field">
          <label htmlFor="lt-round">2. Send to everyone — round name</label>
          <div className="pa-row">
            <input id="lt-round" value={round} onChange={(e) => setRound(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
            <button type="button" className="pa-btn" disabled={busy || missingLink || !portal?.smsReady || !eligible.length} onClick={() => confirm(`Text the next 25 confirmed, opted-in guests (round "${round}")?`) && send({})}>Send next 25</button>
          </div>
          <small className="pa-muted">Each guest gets a round only once, so clicking again moves on to the next 25. To send a new message later (like an update), use a new round name such as “update-1”.</small>
        </div>
      </div>
      <div className="pa-row">
        <button type="button" className="mini-btn" disabled={busy || !changed || missingLink} onClick={() => run(async () => { await portalCall(password, "save-settings", { key: "link_text", value: text }); setResult("Message saved. “Text it” in the guest list uses it too."); reloadPortal(); })}>Save message without sending</button>
        {changed && <span className="pa-muted" style={{ fontSize: 13 }}>Unsaved changes — sending also saves them.</span>}
      </div>
      {result && <div className="message" role="status" style={{ margin: 0 }}>{result}</div>}
    </section>
  );
}
