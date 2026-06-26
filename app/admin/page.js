"use client";

import { useState } from "react";

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

    const res = await fetch("/api/admin-rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.ok) {
      setMessage(data.error || "Could not open admin dashboard.");
      return;
    }

    setRsvps(data.rsvps || []);
    setUnlocked(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/admin-update-rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, rsvp: editing }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || !data.ok) {
      setMessage(data.error || "Could not save RSVP.");
      return;
    }

    setRsvps(rsvps.map((r) => (r.id === data.rsvp.id ? data.rsvp : r)));
    setEditing(null);
    setMessage("RSVP updated successfully.");
  }

  async function deleteRSVP(id) {
    if (!confirm("Delete this RSVP?")) return;

    const res = await fetch("/api/admin-delete-rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, id }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      setMessage(data.error || "Could not delete RSVP.");
      return;
    }

    setRsvps(rsvps.filter((r) => r.id !== id));
    setMessage("RSVP deleted.");
  }

  const filtered = rsvps.filter((r) =>
    `${r.full_name} ${r.phone} ${r.attending}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalGuests = rsvps.reduce((sum, r) => sum + Number(r.guest_count || 0), 0);
  const attendingGuests = rsvps
    .filter((r) => String(r.attending || "").toLowerCase().includes("si") || String(r.attending || "").toLowerCase().includes("sí") || String(r.attending || "").toLowerCase().includes("yes"))
    .reduce((sum, r) => sum + Number(r.guest_count || 0), 0);

  if (!unlocked) {
    return (
      <main className="page sparkle-bg">
        <section className="shell fade-in">
          <div className="hero">
            <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />
            <div className="badge">Admin Portal</div>
          </div>

          <div className="card">
            <h1>Admin Dashboard</h1>
            <p>Enter the password to view RSVP responses.</p>

            <form className="form" onSubmit={login}>
              <div className="field">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <button className="btn" type="submit" disabled={loading}>
                {loading ? <span className="loader" /> : "Enter Dashboard"}
              </button>
            </form>

            {message && <div className="message">{message}</div>}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page sparkle-bg">
      <section className="shell fade-in">
        <div className="hero no-print">
          <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />
          <div className="badge">Admin Dashboard</div>
        </div>

        <div className="card admin-card">
          <h1>RSVP Overview</h1>

          <div className="stats">
            <div><strong>{rsvps.length}</strong><span>Total RSVPs</span></div>
            <div><strong>{totalGuests}</strong><span>Total Guests</span></div>
            <div><strong>{attendingGuests}</strong><span>Attending</span></div>
          </div>

          <div className="actions no-print">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, response" />
            <button className="btn secondary" onClick={() => window.print()}>Print List</button>
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
                      <button className="mini-btn" onClick={() => setEditing(r)}>Edit</button>
                      <button className="mini-btn danger" onClick={() => deleteRSVP(r.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {message && <div className="message">{message}</div>}
        </div>

        <div className="footer no-print">Con cariño, Lucy's Quinceañera</div>
      </section>

      {editing && (
        <div className="modal no-print">
          <form className="modal-card" onSubmit={saveEdit}>
            <h2>Edit RSVP</h2>

            {["full_name", "attending", "guest_count", "phone", "travel_from", "additional_guests", "confirmed_guests", "comments"].map((field) => (
              <div className="field" key={field}>
                <label>{field.replaceAll("_", " ")}</label>
                <input
                  value={editing[field] || ""}
                  onChange={(e) => setEditing({ ...editing, [field]: field === "guest_count" ? Number(e.target.value) : e.target.value })}
                />
              </div>
            ))}

            <div className="actions">
              <button className="btn" type="submit">{loading ? "Saving..." : "Save"}</button>
              <button className="btn secondary" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
