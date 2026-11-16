"use client";
// Read-only song request list for the DJ. Refreshes every 30 seconds.
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Icon, api } from "../../guest/ui";

export default function DjList() {
  const { code } = useParams();
  const [songs, setSongs] = useState(null);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      api("/api/dj", { code })
        .then((d) => {
          if (!alive) return;
          setSongs(d.songs);
          setUpdated(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
          setError("");
        })
        .catch((e) => alive && setError(e.status === 403 ? "This DJ link isn't valid." : "Couldn't refresh — retrying."));
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [code]);

  return (
    <div className="gp">
      <header className="gp-top">
        <img src="/logo.png" alt="Lucy's Quinceañera" className="gp-logo" />
        <span className="gp-pill dark">DJ</span>
      </header>
      <main className="gp-wrap gp-stack" style={{ paddingBottom: 40 }}>
        <header className="gp-col" style={{ gap: 6 }}>
          <h1 className="gp-h1">Song requests</h1>
          <p className="gp-muted">Most votes first{updated ? ` · updated ${updated}` : ""}</p>
        </header>
        {error && <div className="message">{error}</div>}
        <section className="gp-card">
          {songs === null ? <p className="gp-muted">Loading…</p> : songs.length === 0 ? <p className="gp-muted">No requests yet.</p> : (
            <ol className="gp-songs numbered">
              {songs.map((s, i) => (
                <li key={i}>
                  <div className="gp-col"><strong>{s.title}</strong>{s.artist && <span className="gp-small gp-muted">{s.artist}</span>}</div>
                  <span className="gp-vote static"><Icon name="heart" size={16} />{s.votes}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
