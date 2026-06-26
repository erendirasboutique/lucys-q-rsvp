"use client";

import { useState } from "react";

const emptyForm = {
  id: "",
  full_name: "",
  phone: "",
  travel_from: "",
  attending: "",
  guest_count: 1,
  additional_guests: "",
  confirmed_guests: "",
  comments: "",
};

const text = {
  es: {
    badge: "Portal de RSVP",
    searchTitle: "Buscar RSVP",
    searchIntro: "Ingrese su nombre completo y número de teléfono para ver o cambiar su respuesta.",
    fullName: "Nombre completo",
    phone: "Número de teléfono",
    phonePlaceholder: "Ej. 1234567",
    namePlaceholder: "Ej. María Garcia",
    searchBtn: "Buscar mi RSVP",
    searching: "Buscando...",
    found: "Encontramos su RSVP. Puede hacer cambios abajo.",
    notFound: "No pudimos encontrar su RSVP.",
    hello: "Hola",
    editIntro: "Actualice su RSVP para la quinceañera de Lucy.",
    attending: "¿Vas a asistir?",
    selectOption: "Seleccione una opción",
    yes: "Sí",
    no: "No",
    maybe: "Tal vez",
    groupCount: "Personas en su grupo",
    travelFrom: "¿Desde dónde viaja?",
    additionalGuests: "Invitados Adicionales",
    confirmGroup: "Confirmar Su Grupo",
    comments: "Preguntas o comentarios",
    save: "Guardar cambios",
    saving: "Guardando...",
    saved: "¡Sus cambios fueron guardados! Gracias.",
    another: "Buscar otra RSVP",
    footer: "Con cariño, Lucy's Quinceañera",
    language: "Idioma",
  },
  en: {
    badge: "RSVP Portal",
    searchTitle: "Find RSVP",
    searchIntro: "Enter your full name and phone number to view or update your RSVP.",
    fullName: "Full Name",
    phone: "Phone Number",
    phonePlaceholder: "Ex. 1234567",
    namePlaceholder: "Ex. Maria Garcia",
    searchBtn: "Find My RSVP",
    searching: "Searching...",
    found: "We found your RSVP. You can make changes below.",
    notFound: "We could not find your RSVP.",
    hello: "Hello",
    editIntro: "Update your RSVP for Lucy's quinceañera.",
    attending: "Are you attending?",
    selectOption: "Select an option",
    yes: "Yes",
    no: "No",
    maybe: "Maybe",
    groupCount: "People in your group",
    travelFrom: "Where are you traveling from?",
    additionalGuests: "Additional Guests",
    confirmGroup: "Confirm Your Group",
    comments: "Questions or comments",
    save: "Save changes",
    saving: "Saving...",
    saved: "Your changes were saved! Thank you.",
    another: "Find another RSVP",
    footer: "With love, Lucy's Quinceañera",
    language: "Language",
  },
};

function firstName(fullName) {
  return (fullName || "").trim().split(" ")[0] || "";
}

function guestDisplay(rsvp) {
  const name = firstName(rsvp.full_name);
  const extraGuests = rsvp.additional_guests || "";

  if (!extraGuests) return name;

  return `${name}\n${extraGuests}`;
}

export default function HomePage() {
  const [lang, setLang] = useState("es");
  const t = text[lang];

  const [lookup, setLookup] = useState({ full_name: "", phone: "" });
  const [rsvp, setRsvp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  async function searchRSVP(event) {
    event.preventDefault();
    setLoading(true);
    setSuccess(false);
    setMessage("");
    setRsvp(null);

    try {
      const response = await fetch("/api/search-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lookup),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || t.notFound);
      }

      setRsvp({ ...emptyForm, ...data.rsvp });
      setMessage(t.found);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveRSVP(event) {
    event.preventDefault();
    setLoading(true);
    setSuccess(false);
    setMessage("");

    try {
      const response = await fetch("/api/update-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rsvp),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not save changes.");
      }

      setRsvp({ ...emptyForm, ...data.rsvp });
      setSuccess(true);
      setMessage(t.saved);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  const guestNames = rsvp ? guestDisplay(rsvp) : "";

  return (
    <main className="page">
      <div className="sparkles" aria-hidden="true" />
      <div className="flower-petals" aria-hidden="true">
        <span /> <span /> <span /> <span /> <span /> <span /> <span /> <span />
      </div>

      <div className="petals" aria-hidden="true">
        <span className="petal" /><span className="petal" /><span className="petal" />
        <span className="petal" /><span className="petal" /><span className="petal" />
      </div>

      <section className="shell">
       <div className="hero">
  <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />

  <div className="heroBadges">
    <div className="badge">{t.badge}</div>

    <div className="language-switch">
      <label>{t.language}</label>
      <select value={lang} onChange={(e) => setLang(e.target.value)}>
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </div>
  </div>

  {!rsvp && (
    <div className="videoBox">
      <video
        src="/lucy-video.mp4"
        autoPlay
        muted
        loop
        playsInline
        controls
      />
    </div>
  )}
</div>
                  <div className="field">
                    <label>{t.phone}</label>
                    <input
                      value={lookup.phone}
                      onChange={(e) => setLookup({ ...lookup, phone: e.target.value })}
                      placeholder={t.phonePlaceholder}
                      required
                    />
                  </div>
                </div>

                <button className="btn" disabled={loading} type="submit">
                  {loading ? <span className="loader" /> : t.searchBtn}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>{t.hello}, {rsvp.full_name}</h2>
              <p>{t.editIntro}</p>

              {success && (
                <div className="success-screen">
                  <div className="success-check">✓</div>
                  <strong>{t.saved}</strong>
                </div>
              )}

              <form className="form" onSubmit={saveRSVP}>
                <div className="grid2">
                  <div className="field">
                    <label>{t.attending}</label>
                    <select
                      value={rsvp.attending || ""}
                      onChange={(e) => setRsvp({ ...rsvp, attending: e.target.value })}
                    >
                      <option value="">{t.selectOption}</option>
                      <option value="Si/Yes">Si/Yes</option>
                      <option value="Sí">{t.yes}</option>
                      <option value="No">{t.no}</option>
                      <option value="Tal vez">{t.maybe}</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>{t.groupCount}</label>
                    <input
                      type="number"
                      min="1"
                      value={rsvp.guest_count || 1}
                      onChange={(e) => setRsvp({ ...rsvp, guest_count: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>{t.travelFrom}</label>
                  <input
                    value={rsvp.travel_from || ""}
                    onChange={(e) => setRsvp({ ...rsvp, travel_from: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>{t.additionalGuests}</label>
                  <textarea value={guestNames} readOnly />
                </div>

                <div className="field">
                  <label>{t.confirmGroup}</label>
                  <textarea value={guestNames} readOnly />
                </div>

                <div className="field">
                  <label>{t.comments}</label>
                  <textarea
                    value={rsvp.comments || ""}
                    onChange={(e) => setRsvp({ ...rsvp, comments: e.target.value })}
                  />
                </div>

                <div className="actions">
                  <button className="btn" disabled={loading} type="submit">
                    {loading ? <span className="loader" /> : t.save}
                  </button>

                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      setRsvp(null);
                      setMessage("");
                      setSuccess(false);
                    }}
                  >
                    {t.another}
                  </button>
                </div>
              </form>
            </>
          )}

          {message && <div className={success ? "message success-message" : "message"}>{message}</div>}
        </div>

        <div className="footer">{t.footer}</div>
      </section>
    </main>
  );
}
