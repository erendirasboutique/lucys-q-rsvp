"use client";

import { useState } from "react";

const blankEdit = {
  id: "",
  full_name: "",
  attending: "",
  guest_count: 1,
  phone: "",
  travel_from: "",
  additional_guests: "",
  confirmed_guests: "",
  comments: "",
};

function isYes(value) {
  const v = String(value || "").toLowerCase();
  return v.includes("si") || v.includes("sí") || v.includes("yes");
}

function isNo(value) {
  return String(value || "").toLowerCase().includes("no");
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [rsvps, setRsvps] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin-rsvps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not open admin dashboard.");
      setRsvps(data.rsvps || []);
      setUnlocked(true);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshList() {
    const res = await fetch("/api/admin-rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (res.ok && data.ok) setRsvps(data.rsvps || []);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin-update-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, rsvp: editing }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not save RSVP.");
      setRsvps(rsvps.map((r) => (r.id === data.rsvp.id ? data.rsvp : r)));
      setEditing(null);
      setMessage("RSVP updated successfully.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRSVP(id) {
    if (!confirm("Delete this RSVP?")) return;
    setMessage("");

    try {
      const res = await fetch("/api/admin-delete-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not delete RSVP.");
      setRsvps(rsvps.filter((r) => r.id !== id));
      setMessage("RSVP deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function exportCSV() {
    const headers = ["Name", "Attending", "Guests", "Phone", "From", "Additional Guests", "Confirmed Group", "Comments", "Updated At"];
    const rows = rsvps.map((r) => [
      r.full_name,
      r.attending,
      r.guest_count,
      r.phone,
      r.travel_from,
      r.additional_guests,
      r.confirmed_guests,
      r.comments,
      r.updated_at,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lucys-quince-rsvps.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rsvps.filter((r) =>
    `${r.full_name} ${r.phone} ${r.attending} ${r.travel_from}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalGuests = rsvps.reduce((sum, r) => sum + Number(r.guest_count || 0), 0);
  const attendingGuests = rsvps.filter((r) => isYes(r.attending)).reduce((sum, r) => sum + Number(r.guest_count || 0), 0);
  const noCount = rsvps.filter((r) => isNo(r.attending)).length;
  const pendingCount = rsvps.filter((r) => !isYes(r.attending) && !isNo(r.attending)).length;

  if (!unlocked) {
    return (
      <main className="page luxury-page">
        <div className="sparkles" aria-hidden="true" />
        <div className="flower-petals" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
        <section className="shell fade-in admin-shell">
          <div className="hero">
            <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />
            <div className="badge">Admin Portal</div>
          </div>

          <div className="card glass-card">
            <h1>Admin Dashboard</h1>
            <p>Enter the password to view and manage RSVP responses.</p>

            <form className="form" onSubmit={login}>
              <div className="field">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button className="btn" type="submit" disabled={loading}>{loading ? <span className="loader" /> : "Enter Dashboard"}</button>
            </form>
            {message && <div className="message">{message}</div>}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page luxury-page admin-page">
      <div className="sparkles no-print" aria-hidden="true" />
      <div className="flower-petals no-print" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>

      <section className="shell fade-in admin-shell">
        <div className="hero no-print">
          <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />
          <div className="badge">Admin Dashboard</div>
        </div>

        <div className="card glass-card admin-card">
          <div className="adminTop">
            <div>
              <h1>RSVP Overview</h1>
              <p>Manage Lucy's quinceañera guest list.</p>
            </div>
            <button className="btn secondary no-print" onClick={refreshList}>Refresh</button>
          </div>

          <div className="stats">
            <div><strong>{rsvps.length}</strong><span>Total RSVPs</span></div>
            <div><strong>{totalGuests}</strong><span>Total Guests</span></div>
            <div><strong>{attendingGuests}</strong><span>Attending Guests</span></div>
            <div><strong>{noCount}</strong><span>Not Attending RSVPs</span></div>
            <div><strong>{pendingCount}</strong><span>Pending/Other</span></div>
          </div>

          <div className="adminActions no-print">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, response, or city" />
            <button className="btn secondary" onClick={() => window.print()}>Print</button>
            <button className="btn secondary" onClick={exportCSV}>Export CSV</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Attending</th>
                  <th>Guests</th>
                  <th>Phone</th>
                  <th>From</th>
                  <th>Guest Names</th>
                  <th>Comments</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.full_name}</td>
                    <td>{r.attending}</td>
                    <td>{r.guest_count}</td>
                    <td>{r.phone}</td>
                    <td>{r.travel_from}</td>
                    <td>{r.additional_guests || r.confirmed_guests}</td>
                    <td>{r.comments}</td>
                    <td className="no-print">
                      <button className="mini-btn" onClick={() => setEditing({ ...blankEdit, ...r })}>Edit</button>
                      <button className="mini-btn danger" onClick={() => deleteRSVP(r.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {message && <div className="message">{message}</div>}
        </div>

        <footer className="footer no-print">
          <div className="footerDivider" />
          <p>Con cariño, Lucy's Quinceañera</p>
          <div className="footerLinks">
            <a href="https://lucysquinceanera.com" target="_blank" rel="noopener noreferrer">Home</a>
            <a href="https://lucysquinceanera.com" target="_blank" rel="noopener noreferrer">Lucy's Quinceañera</a>
          </div>
        </footer>
      </section>

      {editing && (
        <div className="modal no-print">
          <form className="modal-card" onSubmit={saveEdit}>
            <h2>Edit RSVP</h2>

            <div className="field"><label>Name</label><input value={editing.full_name || ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></div>
            <div className="grid2">
              <div className="field"><label>Attending</label><input value={editing.attending || ""} onChange={(e) => setEditing({ ...editing, attending: e.target.value })} /></div>
              <div className="field"><label>Guest Count</label><input type="number" min="1" value={editing.guest_count || 1} onChange={(e) => setEditing({ ...editing, guest_count: Number(e.target.value) })} /></div>
            </div>
            <div className="field"><label>Phone</label><input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div className="field"><label>Traveling From</label><input value={editing.travel_from || ""} onChange={(e) => setEditing({ ...editing, travel_from: e.target.value })} /></div>
            <div className="field"><label>Additional Guests</label><textarea value={editing.additional_guests || ""} onChange={(e) => setEditing({ ...editing, additional_guests: e.target.value })} /></div>
            <div className="field"><label>Confirmed Group</label><textarea value={editing.confirmed_guests || ""} onChange={(e) => setEditing({ ...editing, confirmed_guests: e.target.value })} /></div>
            <div className="field"><label>Comments</label><textarea value={editing.comments || ""} onChange={(e) => setEditing({ ...editing, comments: e.target.value })} /></div>

            <div className="actions">
              <button className="btn" type="submit" disabled={loading}>{loading ? <span className="loader" /> : "Save"}</button>
              <button className="btn secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
