"use client";

import { useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [rsvps, setRsvps] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function login(e) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin-rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      setMessage(data.error || "Could not open admin dashboard.");
      return;
    }

    setRsvps(data.rsvps || []);
    setUnlocked(true);
  }

  const filtered = rsvps.filter((rsvp) => {
    const text = `${rsvp.full_name} ${rsvp.phone} ${rsvp.attending}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const totalGuests = rsvps.reduce(
    (sum, r) => sum + Number(r.guest_count || 0),
    0
  );

  const attending = rsvps
    .filter((r) => String(r.attending || "").toLowerCase().includes("si") || String(r.attending || "").toLowerCase().includes("sí") || String(r.attending || "").toLowerCase().includes("yes"))
    .reduce((sum, r) => sum + Number(r.guest_count || 0), 0);

  const notAttending = rsvps.filter((r) =>
    String(r.attending || "").toLowerCase().includes("no")
  ).length;

  if (!unlocked) {
    return (
      <main className="page">
        <section className="shell">
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
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button className="btn" type="submit">
                Enter Dashboard
              </button>
            </form>

            {message && <div className="message">{message}</div>}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="shell">
        <div className="hero">
          <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />
          <div className="badge">Admin Dashboard</div>
        </div>

        <div className="card">
          <h1>RSVP Overview</h1>

          <div className="grid2">
            <div className="field">
              <label>Total RSVPs</label>
              <input value={rsvps.length} readOnly />
            </div>

            <div className="field">
              <label>Total Guests</label>
              <input value={totalGuests} readOnly />
            </div>

            <div className="field">
              <label>Attending Guests</label>
              <input value={attending} readOnly />
            </div>

            <div className="field">
              <label>Not Attending RSVPs</label>
              <input value={notAttending} readOnly />
            </div>
          </div>

          <div className="field">
            <label>Search</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, or response"
            />
          </div>

          <div style={{ overflowX: "auto", marginTop: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Attending</th>
                  <th>Guests</th>
                  <th>Phone</th>
                  <th>Traveling From</th>
                  <th>Guest Names</th>
                  <th>Comments</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((rsvp) => (
                  <tr key={rsvp.id}>
                    <td>{rsvp.full_name}</td>
                    <td>{rsvp.attending}</td>
                    <td>{rsvp.guest_count}</td>
                    <td>{rsvp.phone}</td>
                    <td>{rsvp.travel_from}</td>
                    <td>{rsvp.additional_guests}</td>
                    <td>{rsvp.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
