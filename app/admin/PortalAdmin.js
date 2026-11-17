"use client";
// Admin pieces for the personal guest pages: links, per-guest page fields, Arrivals, Program and Inbox tabs.
import { useMemo, useState } from "react";

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

export const fmtTime = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
  if (!m) return t || "";
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};
export const fmtDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(String(d || "")) ? new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }) : d || "");
export const when = (v) => (v ? new Date(v).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

export function linkFor(siteUrl, r) {
  return r?.access_token ? `${siteUrl || (typeof window !== "undefined" ? window.location.origin : "")}/g/${r.access_token}` : "";
}

export async function copy(text) {
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
