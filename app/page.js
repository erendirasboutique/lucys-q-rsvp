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

export default function HomePage() {
  const [lookup, setLookup] = useState({ full_name: "", phone: "" });
  const [rsvp, setRsvp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function searchRSVP(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setRsvp(null);

    try {
      const response = await fetch("/api/search-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lookup),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No pudimos encontrar su RSVP.");
      setRsvp({ ...emptyForm, ...data.rsvp });
      setMessage("Encontramos su RSVP. Puede hacer cambios abajo.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveRSVP(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/update-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rsvp),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudieron guardar los cambios.");
      setRsvp({ ...emptyForm, ...data.rsvp });
      setMessage("¡Sus cambios fueron guardados! Gracias.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="petals" aria-hidden="true">
        <span className="petal" /><span className="petal" /><span className="petal" />
        <span className="petal" /><span className="petal" /><span className="petal" />
      </div>

      <section className="shell">
        <div className="hero">
          <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />
          <div className="badge">Portal de RSVP</div>
        </div>

        <div className="card">
          {!rsvp ? (
            <>
              <h1>Buscar RSVP</h1>
              <p>
                Ingrese su nombre completo y número de teléfono para ver o cambiar su respuesta.
              </p>

              <form className="form" onSubmit={searchRSVP}>
                <div className="grid2">
                  <div className="field">
                    <label>Nombre completo</label>
                    <input
                      value={lookup.full_name}
                      onChange={(e) => setLookup({ ...lookup, full_name: e.target.value })}
                      placeholder="Ej. María Garcia"
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Número de teléfono</label>
                    <input
                      value={lookup.phone}
                      onChange={(e) => setLookup({ ...lookup, phone: e.target.value })}
                      placeholder="Ej. 9091234567"
                      required
                    />
                  </div>
                </div>
                <button className="btn" disabled={loading} type="submit">
                  {loading ? "Buscando..." : "Buscar mi RSVP"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Hola, {rsvp.full_name}</h2>
              <p>Actualice su RSVP para la quinceañera de Lucy.</p>

              <form className="form" onSubmit={saveRSVP}>
                <div className="grid2">
                  <div className="field">
                    <label>¿Va a asistir?</label>
                    <select
                      value={rsvp.attending || ""}
                      onChange={(e) => setRsvp({ ...rsvp, attending: e.target.value })}
                    >
                      <option value="">Seleccione una opción</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                      <option value="Tal vez">Tal vez</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Personas en su grupo</label>
                    <input
                      type="number"
                      min="1"
                      value={rsvp.guest_count || 1}
                      onChange={(e) => setRsvp({ ...rsvp, guest_count: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>¿Desde dónde viaja?</label>
                  <input
                    value={rsvp.travel_from || ""}
                    onChange={(e) => setRsvp({ ...rsvp, travel_from: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Invitados adicionales</label>
                  <textarea
                    value={rsvp.additional_guests || ""}
                    onChange={(e) => setRsvp({ ...rsvp, additional_guests: e.target.value })}
                    placeholder="Nombres de invitados adicionales"
                  />
                </div>

                <div className="field">
                  <label>Confirmar su grupo</label>
                  <textarea
                    value={rsvp.confirmed_guests || ""}
                    onChange={(e) => setRsvp({ ...rsvp, confirmed_guests: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Preguntas o comentarios</label>
                  <textarea
                    value={rsvp.comments || ""}
                    onChange={(e) => setRsvp({ ...rsvp, comments: e.target.value })}
                  />
                </div>

                <div className="actions">
                  <button className="btn" disabled={loading} type="submit">
                    {loading ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button className="btn secondary" type="button" onClick={() => { setRsvp(null); setMessage(""); }}>
                    Buscar otra RSVP
                  </button>
                </div>
              </form>
            </>
          )}

          {message && <div className="message">{message}</div>}
        </div>

        <div className="footer">Con cariño, Lucy's Quinceañera</div>
      </section>
    </main>
  );
}
