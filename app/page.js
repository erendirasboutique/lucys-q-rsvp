'use client';

import { useState } from 'react';

const blankRSVP = {
  attending: '',
  travel_from: '',
  guest_count: 1,
  additional_guests: '',
  confirmed_guests: '',
  phone: '',
  comments: '',
};

export default function HomePage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [rsvp, setRsvp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  async function searchRSVP(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');
    setRsvp(null);

    try {
      const response = await fetch('/api/search-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No pudimos encontrar su RSVP.');
      setRsvp({ ...blankRSVP, ...data.rsvp });
      setMessage('Encontramos su RSVP. Puede actualizarlo abajo.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function saveRSVP(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await fetch('/api/update-rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rsvp.id,
          phone,
          updates: {
            attending: rsvp.attending,
            travel_from: rsvp.travel_from,
            guest_count: Number(rsvp.guest_count || 1),
            additional_guests: rsvp.additional_guests,
            confirmed_guests: rsvp.confirmed_guests,
            comments: rsvp.comments,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron guardar los cambios.');
      setRsvp({ ...rsvp, ...data.rsvp });
      setMessage('¡Listo! Sus cambios fueron guardados.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <div className="sparkles" aria-hidden="true"><span/><span/><span/><span/><span/><span/></div>
      <section className="portal-card">
        <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />
        <p className="kicker">Portal de RSVP</p>
        <h1>Lucy&apos;s Quinceañera</h1>
        <p className="subtitle">Busque su RSVP con su nombre completo y número de teléfono para confirmar o actualizar su grupo.</p>
        <div className="divider" />

        {!rsvp && (
          <form className="form" onSubmit={searchRSVP}>
            <div>
              <label>Nombre completo</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej. Maria Garcia" required />
            </div>
            <div>
              <label>Número de teléfono</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. 9091234567" required />
            </div>
            <button className="btn" disabled={loading}>{loading ? 'Buscando...' : 'Buscar mi RSVP'}</button>
          </form>
        )}

        {rsvp && (
          <form className="form" onSubmit={saveRSVP}>
            <h2 className="found-title">Hola, {rsvp.full_name}</h2>
            <div className="grid-two">
              <div>
                <label>¿Va a asistir?</label>
                <select value={rsvp.attending || ''} onChange={(e) => setRsvp({ ...rsvp, attending: e.target.value })} required>
                  <option value="">Seleccione</option>
                  <option value="Sí">Sí, asistiré</option>
                  <option value="No">No podré asistir</option>
                </select>
              </div>
              <div>
                <label>Personas en su grupo</label>
                <input type="number" min="1" max="10" value={rsvp.guest_count || 1} onChange={(e) => setRsvp({ ...rsvp, guest_count: e.target.value })} />
              </div>
            </div>
            <div>
              <label>¿Desde dónde viaja?</label>
              <input value={rsvp.travel_from || ''} onChange={(e) => setRsvp({ ...rsvp, travel_from: e.target.value })} />
            </div>
            <div>
              <label>Nombres de invitados adicionales</label>
              <textarea value={rsvp.additional_guests || ''} onChange={(e) => setRsvp({ ...rsvp, additional_guests: e.target.value })} placeholder="Invitado 2, Invitado 3..." />
            </div>
            <div>
              <label>Confirmación de grupo</label>
              <textarea value={rsvp.confirmed_guests || ''} onChange={(e) => setRsvp({ ...rsvp, confirmed_guests: e.target.value })} />
            </div>
            <div>
              <label>Preguntas o comentarios</label>
              <textarea value={rsvp.comments || ''} onChange={(e) => setRsvp({ ...rsvp, comments: e.target.value })} />
            </div>
            <button className="btn" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
            <button className="btn secondary-btn" type="button" onClick={() => { setRsvp(null); setMessage(''); }}>Buscar otro RSVP</button>
          </form>
        )}

        {message && <p className={`message ${messageType}`}>{message}</p>}
        <p className="footer">Con amor para la quinceañera de Lucy ✨</p>
      </section>
    </main>
  );
}
