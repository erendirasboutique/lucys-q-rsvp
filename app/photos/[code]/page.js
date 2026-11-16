"use client";
// Opened from the QR card on each table: upload photos/videos and see the latest ones.
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { T } from "../../guest/i18n";
import { Icon, api, uploadFile } from "../../guest/ui";

export default function TablePhotos() {
  const { code } = useParams();
  const [lang, setLang] = useState("es");
  const t = T[lang];
  const [list, setList] = useState(null);
  const [table, setTable] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const l = localStorage.getItem("lq_lang");
      if (l === "en" || l === "es") setLang(l);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/photos", { action: "list", tableCode: decodeURIComponent(code) });
      setList(d.photos);
      setTable(d.table);
    } catch (e) {
      setError(e.status === 403 ? (lang === "es" ? "Este código de mesa no es válido." : "This table code isn't valid.") : t.error);
      setList([]);
    }
  }, [code, lang, t.error]);

  useEffect(() => {
    load();
  }, [load]);

  async function onFiles(files) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    let done = 0;
    for (const file of Array.from(files)) {
      setProgress(`${t.uploading} ${done + 1}/${files.length}`);
      try {
        const up = await uploadFile(file, { kind: "photo", tableCode: decodeURIComponent(code) });
        await api("/api/photos", { action: "record", path: up.path, ticket: up.ticket, contentType: up.contentType, tableCode: decodeURIComponent(code) });
        done++;
      } catch {
        setError(t.photoFailed);
      }
    }
    setProgress(done ? t.photosUploaded(done) : "");
    setBusy(false);
    load();
  }

  return (
    <div className="gp">
      <header className="gp-top">
        <img src="/logo.png" alt="Lucy's Quinceañera" className="gp-logo" />
        <div className="gp-seg small" role="group" aria-label={t.language}>
          {["es", "en"].map((l) => <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
        </div>
      </header>
      <main className="gp-wrap gp-stack" style={{ paddingBottom: 40 }}>
        <header className="gp-col" style={{ gap: 6 }}>
          <h1 className="gp-h1">{t.tablePhotos(table)}</h1>
          <p className="gp-muted">{t.photosIntro}</p>
        </header>
        <label className={`gp-drop big ${busy ? "busy" : ""}`}>
          <Icon name="upload" size={32} color="#b8005f" />
          {busy ? progress : t.addPhotos}
          <span className="gp-small gp-muted">{t.photosNote}</span>
          <input type="file" accept="image/*,video/*" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
        </label>
        {!busy && progress && <p className="gp-okbar" role="status"><Icon name="check" />{progress}</p>}
        {error && <div className="message" role="alert">{error}</div>}
        <section className="gp-card">
          <span className="gp-eyebrow">{t.fromTonight}</span>
          {list === null ? <p className="gp-muted">{t.loading}</p> : list.length === 0 ? <p className="gp-muted">{t.photosSoon}</p> : (
            <div className="gp-photos">
              {list.map((p) => p.video ? <video key={p.url} src={p.url} controls playsInline preload="metadata" /> : <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer"><img src={p.url} alt="" loading="lazy" /></a>)}
            </div>
          )}
        </section>
        <p className="gp-footer">{t.footer}</p>
      </main>
    </div>
  );
}
