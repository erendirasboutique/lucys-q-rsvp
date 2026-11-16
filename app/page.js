"use client";
// rsvp.lucysquinceanera.com — guest sign-in, then each guest's personal page.
import { useCallback, useEffect, useRef, useState } from "react";
import Portal from "./guest/Portal";
import { T } from "./guest/i18n";
import { Icon, api } from "./guest/ui";

const EVENT_DATE = "2027-01-04T17:00:00-06:00";

function getCountdown() {
  const distance = Math.max(new Date(EVENT_DATE).getTime() - Date.now(), 0);
  return {
    days: Math.floor(distance / 864e5),
    hours: Math.floor((distance / 36e5) % 24),
    minutes: Math.floor((distance / 6e4) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
}

function initialLang() {
  try {
    const saved = localStorage.getItem("lq_lang");
    if (saved === "es" || saved === "en") return saved;
  } catch {}
  return "es";
}

export default function HomePage() {
  const [lang, setLangState] = useState("es");
  const [state, setState] = useState("loading"); // loading | signin | portal
  const [data, setData] = useState(null);
  const t = T[lang];

  const setLang = useCallback((l) => {
    setLangState(l);
    try {
      localStorage.setItem("lq_lang", l);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api("/api/guest/me");
      setData(d);
      setState("portal");
      return d;
    } catch (e) {
      if (e.status === 401) setState("signin");
      else setState((s) => (s === "portal" ? s : "signin"));
      return null;
    }
  }, []);

  useEffect(() => {
    setLangState(initialLang());
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    (async () => {
      if (code) {
        try {
          await api("/api/guest/login", { code });
        } catch {}
        window.history.replaceState({}, "", "/");
      }
      const d = await load();
      if (d?.guest?.preferred_language && !localStorage.getItem("lq_lang")) setLangState(d.guest.preferred_language);
    })();
  }, [load]);

  async function signOut() {
    try {
      await api("/api/guest/logout", {});
    } catch {}
    setData(null);
    setState("signin");
  }

  if (state === "loading") {
    return (
      <main className="gp gp-center">
        <img src="/logo.png" alt="Lucy's Quinceañera" className="gp-logo" />
        <span className="loader" aria-label={t.loading} />
      </main>
    );
  }

  if (state === "portal" && data) {
    return <Portal data={data} lang={lang} setLang={setLang} reload={load} onSignOut={signOut} />;
  }

  return <SignIn lang={lang} setLang={setLang} onSignedIn={load} />;
}

function SignIn({ lang, setLang, onSignedIn }) {
  const t = T[lang];
  const [form, setForm] = useState({ full_name: "", phone: "", remember: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(getCountdown());
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setCountdown(getCountdown()), 1000);
    const link = new URLSearchParams(window.location.search).get("link");
    if (link) {
      setMessage(link === "invalid" ? T[lang].linkInvalid : T[lang].error);
      window.history.replaceState({}, "", "/");
    }
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api("/api/guest/login", form);
      await onSignedIn();
    } catch (err) {
      setMessage(err.message === "not_found" ? t.notFound : err.message && err.message !== "error" ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
    try {
      await v.play();
    } catch {}
  }

  return (
    <main className="page luxury-page">
      <div className="sparkles" aria-hidden="true" />
      <div className="flower-petals" aria-hidden="true">
        <span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
      </div>
      <section className="shell fade-in gp-signin">
        <div className="hero">
          <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />
          <div className="heroBadges">
            <div className="badge">{t.badge}</div>
            <div className="gp-seg small" role="group" aria-label={t.language}>
              {["es", "en"].map((l) => <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>{l === "es" ? "Español" : "English"}</button>)}
            </div>
          </div>
          <div className="countdownCard">
            <p>{t.countdownTitle}</p>
            <div className="countdownGrid">
              <div><strong>{countdown.days}</strong><span>{t.days}</span></div>
              <div><strong>{countdown.hours}</strong><span>{t.hours}</span></div>
              <div><strong>{countdown.minutes}</strong><span>{t.minutes}</span></div>
              <div><strong>{countdown.seconds}</strong><span>{t.seconds}</span></div>
            </div>
          </div>
          <div className="videoBox">
            <video ref={videoRef} src="/lucy-video.mp4" autoPlay muted={muted} loop playsInline controls onError={(e) => { e.currentTarget.closest(".videoBox").style.display = "none"; }} />
            <button className="soundToggle" type="button" onClick={toggleSound}>{muted ? t.soundOn : t.soundOff}</button>
          </div>
        </div>

        <div className="gp-card hl gp-signin-card">
          <div className="gp-col" style={{ gap: 6 }}>
            <h1 className="gp-h1" style={{ fontSize: 30 }}>{t.signInTitle}</h1>
            <p className="gp-muted">{t.signInIntro}</p>
          </div>
          <div className="gp-note"><Icon name="link" color="#b8005f" /><p>{t.linkTip}</p></div>
          <div className="gp-or"><span />{t.orSignIn}<span /></div>
          <form className="gp-col" style={{ gap: 14 }} onSubmit={submit}>
            <div className="gp-field">
              <label htmlFor="si-name">{t.fullName}</label>
              <input id="si-name" className="gp-input" autoComplete="name" value={form.full_name} placeholder={t.namePlaceholder} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="gp-field">
              <label htmlFor="si-phone">{t.phone}</label>
              <input id="si-phone" className="gp-input" inputMode="tel" autoComplete="tel" value={form.phone} placeholder={t.phonePlaceholder} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <small>{t.phoneHelp}</small>
            </div>
            <label className="gp-check"><input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />{t.remember}</label>
            <button className="gp-btn big" type="submit" disabled={busy}>{busy ? <span className="loader" /> : t.openPage}</button>
          </form>
          {message && <div className="message" role="alert">{message}</div>}
          <p className="gp-small gp-muted gp-row" style={{ gap: 8, justifyContent: "center" }}><Icon name="lock" size={16} />{t.privateNote}</p>
        </div>

        <footer className="footer">
          <div className="footerDivider" />
          <p>{t.footer}</p>
          <div className="footerLinks">
            <a href="https://lucysquinceanera.com" target="_blank" rel="noopener noreferrer">{t.home}</a>
            <a href="https://lucysquinceanera.com" target="_blank" rel="noopener noreferrer">{t.site}</a>
          </div>
        </footer>
      </section>
    </main>
  );
}
