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
  table_number: "",
  checkin_code: "",
  checked_in: false,
  checked_in_at: "",
};
 
const text = {
  es: {
    language: "Idioma",
    adminPortal: "Portal de Admin",
    adminDashboard: "Panel de Administracion",
    loginIntro: "Ingrese la contrasena para ver y administrar las respuestas RSVP.",
    password: "Contrasena",
    enterDashboard: "Entrar al Panel",
    opening: "Abriendo...",
    couldNotOpen: "No se pudo abrir el panel de administracion.",
    wrongSave: "No se pudo guardar el RSVP.",
    wrongDelete: "No se pudo borrar el RSVP.",
    wrongCheckin: "No se pudo registrar la llegada del invitado.",
    updated: "RSVP actualizado correctamente.",
    deleted: "RSVP borrado.",
    confirmDelete: "¿Borrar este RSVP?",
    arrivedMessage: (name) => `${name} ha llegado.`,
    overview: "Resumen de RSVP",
    overviewIntro: "Administre la lista de invitados, mesas y check-in de la quinceanera de Lucy.",
    refresh: "Actualizar",
    totalRsvps: "Total de RSVPs",
    totalGuests: "Total de Invitados",
    attendingGuests: "Invitados que Asisten",
    checkedInGuests: "Invitados Registrados",
    notAttending: "RSVPs que No Asisten",
    pendingOther: "Pendiente/Otro",
    checkinMode: "Modo Check-In",
    checkinHelp: "Busque por codigo, nombre, telefono o mesa. Haga clic en “Llego” cuando el invitado llegue a la fiesta.",
    checkinPlaceholder: "Ingrese codigo, nombre, telefono o mesa",
    code: "Codigo",
    table: "Mesa",
    guests: "Invitados",
    arrived: "Llego",
    markArrived: "Marcar Llegada",
    notCreated: "No creado",
    tbd: "Pendiente",
    tables: "Mesas",
    noTable: "Sin Mesa",
    searchPlaceholder: "Buscar nombre, telefono, respuesta, ciudad, mesa o codigo",
    print: "Imprimir",
    exportCSV: "Exportar CSV",
    name: "Nombre",
    status: "Estado",
    phone: "Telefono",
    guestNames: "Nombres de Invitados",
    comments: "Comentarios",
    actions: "Acciones",
    edit: "Editar",
    delete: "Borrar",
    yes: "Si",
    no: "No",
    editTitle: "Editar RSVP",
    attending: "Asistencia",
    guestCount: "Cantidad de Invitados",
    tableNumber: "Numero de Mesa",
    checkinCode: "Codigo de Check-In",
    generateCode: "Generar Codigo",
    travelingFrom: "Desde donde viaja",
    additionalGuests: "Invitados Adicionales",
    confirmedGroup: "Grupo Confirmado",
    save: "Guardar",
    saving: "Guardando...",
    cancel: "Cancelar",
    footer: "Con carino, Lucy's Quinceanera",
    home: "Home",
    site: "Lucy's Quinceanera",
    csvHeaders: [
      "Nombre",
      "Asistencia",
      "Invitados",
      "Telefono",
      "Desde",
      "Mesa",
      "Codigo de Check-in",
      "Registrado",
      "Hora de Registro",
      "Invitados Adicionales",
      "Grupo Confirmado",
      "Comentarios",
      "Ultima Actualizacion",
    ],
  },
  en: {
    language: "Language",
    adminPortal: "Admin Portal",
    adminDashboard: "Admin Dashboard",
    loginIntro: "Enter the password to view and manage RSVP responses.",
    password: "Password",
    enterDashboard: "Enter Dashboard",
    opening: "Opening...",
    couldNotOpen: "Could not open admin dashboard.",
    wrongSave: "Could not save RSVP.",
    wrongDelete: "Could not delete RSVP.",
    wrongCheckin: "Could not check in guest.",
    updated: "RSVP updated successfully.",
    deleted: "RSVP deleted.",
    confirmDelete: "Delete this RSVP?",
    arrivedMessage: (name) => `${name} has arrived.`,
    overview: "RSVP Overview",
    overviewIntro: "Manage Lucy's quinceanera guest list, tables, and check-ins.",
    refresh: "Refresh",
    totalRsvps: "Total RSVPs",
    totalGuests: "Total Guests",
    attendingGuests: "Attending Guests",
    checkedInGuests: "Checked In Guests",
    notAttending: "Not Attending RSVPs",
    pendingOther: "Pending/Other",
    checkinMode: "Check-in Mode",
    checkinHelp: "Search by code, name, phone, or table. Click “Arrived” when the guest gets to the party.",
    checkinPlaceholder: "Enter check-in code, name, phone, or table",
    code: "Code",
    table: "Table",
    guests: "Guests",
    arrived: "Arrived",
    markArrived: "Mark Arrived",
    notCreated: "Not created",
    tbd: "TBD",
    tables: "Tables",
    noTable: "No Table",
    searchPlaceholder: "Search name, phone, response, city, table, or code",
    print: "Print",
    exportCSV: "Export CSV",
    name: "Name",
    status: "Status",
    phone: "Phone",
    guestNames: "Guest Names",
    comments: "Comments",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    yes: "Yes",
    no: "No",
    editTitle: "Edit RSVP",
    attending: "Attending",
    guestCount: "Guest Count",
    tableNumber: "Table Number",
    checkinCode: "Check-in Code",
    generateCode: "Generate Code",
    travelingFrom: "Traveling From",
    additionalGuests: "Additional Guests",
    confirmedGroup: "Confirmed Group",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    footer: "With love, Lucy's Quinceanera",
    home: "Home",
    site: "Lucy's Quinceanera",
    csvHeaders: [
      "Name",
      "Attending",
      "Guests",
      "Phone",
      "From",
      "Table",
      "Check-in Code",
      "Checked In",
      "Checked In At",
      "Additional Guests",
      "Confirmed Group",
      "Comments",
      "Updated At",
    ],
  },
};
 
function isYes(value) {
  const v = String(value || "").toLowerCase();
  return v.includes("si") || v.includes("sí") || v.includes("yes");
}
 
function isNo(value) {
  return String(value || "").toLowerCase().includes("no");
}
 
function makeCheckinCode(name = "") {
  const letters = String(name || "GUEST")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase() || "GUE";
  const numbers = Math.floor(1000 + Math.random() * 9000);
  return `${letters}${numbers}`;
}
 
function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
 
export default function AdminPage() {
  const [lang, setLang] = useState("es");
  const t = text[lang];
 
  const [password, setPassword] = useState("");
  const [rsvps, setRsvps] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [checkinSearch, setCheckinSearch] = useState("");
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
      if (!res.ok || !data.ok) throw new Error(data.error || t.couldNotOpen);
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
      if (!res.ok || !data.ok) throw new Error(data.error || t.wrongSave);
      setRsvps(rsvps.map((r) => (r.id === data.rsvp.id ? data.rsvp : r)));
      setEditing(null);
      setMessage(t.updated);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }
 
  async function deleteRSVP(id) {
    if (!confirm(t.confirmDelete)) return;
    setMessage("");
 
    try {
      const res = await fetch("/api/admin-delete-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t.wrongDelete);
      setRsvps(rsvps.filter((r) => r.id !== id));
      setMessage(t.deleted);
    } catch (error) {
      setMessage(error.message);
    }
  }
 
  async function checkInGuest(rsvp) {
    if (!rsvp?.id) return;
    const updated = {
      ...rsvp,
      checked_in: true,
      checked_in_at: new Date().toISOString(),
      checkin_code: rsvp.checkin_code || makeCheckinCode(rsvp.full_name),
    };
 
    try {
      const res = await fetch("/api/admin-update-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, rsvp: updated }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t.wrongCheckin);
      setRsvps(rsvps.map((r) => (r.id === data.rsvp.id ? data.rsvp : r)));
      setMessage(t.arrivedMessage(data.rsvp.full_name));
    } catch (error) {
      setMessage(error.message);
    }
  }
 
  function openEdit(rsvp) {
    const prepared = {
      ...blankEdit,
      ...rsvp,
      checkin_code: rsvp.checkin_code || makeCheckinCode(rsvp.full_name),
    };
    setEditing(prepared);
  }
 
  function exportCSV() {
    const headers = t.csvHeaders;
    const rows = rsvps.map((r) => [
      r.full_name,
      r.attending,
      r.guest_count,
      r.phone,
      r.travel_from,
      r.table_number,
      r.checkin_code,
      r.checked_in ? t.yes : t.no,
      r.checked_in_at,
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
    `${r.full_name} ${r.phone} ${r.attending} ${r.travel_from} ${r.table_number} ${r.checkin_code}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
 
  const checkinMatches = rsvps.filter((r) =>
    `${r.full_name} ${r.phone} ${r.checkin_code} ${r.table_number}`
      .toLowerCase()
      .includes(checkinSearch.toLowerCase())
  );
 
  const totalGuests = rsvps.reduce((sum, r) => sum + Number(r.guest_count || 0), 0);
  const attendingGuests = rsvps.filter((r) => isYes(r.attending)).reduce((sum, r) => sum + Number(r.guest_count || 0), 0);
  const noCount = rsvps.filter((r) => isNo(r.attending)).length;
  const pendingCount = rsvps.filter((r) => !isYes(r.attending) && !isNo(r.attending)).length;
  const checkedInGuests = rsvps.filter((r) => r.checked_in).reduce((sum, r) => sum + Number(r.guest_count || 0), 0);
 
  const tables = rsvps.reduce((groups, rsvp) => {
    const table = rsvp.table_number || t.noTable;
    if (!groups[table]) groups[table] = [];
    groups[table].push(rsvp);
    return groups;
  }, {});
 
  const LanguageSelector = () => (
    <div className="language-switch no-print">
      <label>{t.language}</label>
      <select value={lang} onChange={(e) => setLang(e.target.value)}>
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </div>
  );
 
  if (!unlocked) {
    return (
      <main className="page luxury-page">
        <div className="sparkles" aria-hidden="true" />
        <div className="flower-petals" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
        <section className="shell fade-in admin-shell">
          <div className="hero">
            <img src="/logo.png" alt="Lucy's Quinceañera" className="logo" />
            <div className="heroBadges">
              <div className="badge">{t.adminPortal}</div>
              <LanguageSelector />
            </div>
          </div>
 
          <div className="card glass-card">
            <h1>{t.adminDashboard}</h1>
            <p>{t.loginIntro}</p>
 
            <form className="form" onSubmit={login}>
              <div className="field">
                <label>{t.password}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button className="btn" type="submit" disabled={loading}>{loading ? <span className="loader" /> : t.enterDashboard}</button>
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
          <div className="heroBadges">
            <div className="badge">{t.adminDashboard}</div>
            <LanguageSelector />
          </div>
        </div>
 
        <div className="card glass-card admin-card">
          <div className="adminTop">
            <div>
              <h1>{t.overview}</h1>
              <p>{t.overviewIntro}</p>
            </div>
            <button className="btn secondary no-print" onClick={refreshList}>{t.refresh}</button>
          </div>
 
          <div className="stats">
            <div><strong>{rsvps.length}</strong><span>{t.totalRsvps}</span></div>
            <div><strong>{totalGuests}</strong><span>{t.totalGuests}</span></div>
            <div><strong>{attendingGuests}</strong><span>{t.attendingGuests}</span></div>
            <div><strong>{checkedInGuests}</strong><span>{t.checkedInGuests}</span></div>
            <div><strong>{noCount}</strong><span>{t.notAttending}</span></div>
            <div><strong>{pendingCount}</strong><span>{t.pendingOther}</span></div>
          </div>
 
          <div className="checkinBox no-print">
            <h2>{t.checkinMode}</h2>
            <p>{t.checkinHelp}</p>
            <input
              value={checkinSearch}
              onChange={(e) => setCheckinSearch(e.target.value)}
              placeholder={t.checkinPlaceholder}
            />
            {checkinSearch && (
              <div className="checkinResults">
                {checkinMatches.slice(0, 8).map((r) => (
                  <div className={r.checked_in ? "checkinCard checked" : "checkinCard"} key={r.id}>
                    <div>
                      <strong>{r.full_name}</strong>
                      <span>{t.code}: {r.checkin_code || t.notCreated} • {t.table}: {r.table_number || t.tbd} • {t.guests}: {r.guest_count}</span>
                      {r.checked_in && <small>{t.arrived}: {formatDate(r.checked_in_at)}</small>}
                    </div>
                    <button className="mini-btn" onClick={() => checkInGuest(r)} disabled={r.checked_in}>
                      {r.checked_in ? t.arrived : t.markArrived}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
 
          <div className="tablesSection">
            <h2>{t.tables}</h2>
            <div className="tableCards">
              {Object.keys(tables).sort().map((table) => (
                <div className="tableCard" key={table}>
                  <strong>{table === t.noTable ? t.noTable : `${t.table} ${table}`}</strong>
                  <span>{tables[table].reduce((sum, r) => sum + Number(r.guest_count || 0), 0)} {t.guests}</span>
                  <ul>
                    {tables[table].map((r) => <li key={r.id}>{r.full_name}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
 
          <div className="adminActions no-print">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} />
            <button className="btn secondary" onClick={() => window.print()}>{t.print}</button>
            <button className="btn secondary" onClick={exportCSV}>{t.exportCSV}</button>
          </div>
 
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.status}</th>
                  <th>{t.guests}</th>
                  <th>{t.table}</th>
                  <th>{t.code}</th>
                  <th>{t.arrived}</th>
                  <th>{t.phone}</th>
                  <th>{t.guestNames}</th>
                  <th>{t.comments}</th>
                  <th className="no-print">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.full_name}</td>
                    <td>{r.attending}</td>
                    <td>{r.guest_count}</td>
                    <td>{r.table_number || t.tbd}</td>
                    <td>{r.checkin_code || t.notCreated}</td>
                    <td>{r.checked_in ? `${t.yes} ${formatDate(r.checked_in_at)}` : t.no}</td>
                    <td>{r.phone}</td>
                    <td>{r.additional_guests || r.confirmed_guests}</td>
                    <td>{r.comments}</td>
                    <td className="no-print">
                      <button className="mini-btn" onClick={() => openEdit(r)}>{t.edit}</button>
                      <button className="mini-btn" onClick={() => checkInGuest(r)} disabled={r.checked_in}>{t.arrived}</button>
                      <button className="mini-btn danger" onClick={() => deleteRSVP(r.id)}>{t.delete}</button>
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
          <p>{t.footer}</p>
          <div className="footerLinks">
            <a href="https://lucysquinceanera.com" target="_blank" rel="noopener noreferrer">{t.home}</a>
            <a href="https://lucysquinceanera.com" target="_blank" rel="noopener noreferrer">{t.site}</a>
          </div>
        </footer>
      </section>
 
      {editing && (
        <div className="modal no-print">
          <form className="modal-card" onSubmit={saveEdit}>
            <h2>{t.editTitle}</h2>
 
            <div className="field"><label>{t.name}</label><input value={editing.full_name || ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></div>
            <div className="grid2">
              <div className="field"><label>{t.attending}</label><input value={editing.attending || ""} onChange={(e) => setEditing({ ...editing, attending: e.target.value })} /></div>
              <div className="field"><label>{t.guestCount}</label><input type="number" min="1" value={editing.guest_count || 1} onChange={(e) => setEditing({ ...editing, guest_count: Number(e.target.value) })} /></div>
            </div>
            <div className="grid2">
              <div className="field"><label>{t.tableNumber}</label><input value={editing.table_number || ""} onChange={(e) => setEditing({ ...editing, table_number: e.target.value })} /></div>
              <div className="field">
                <label>{t.checkinCode}</label>
                <input value={editing.checkin_code || ""} onChange={(e) => setEditing({ ...editing, checkin_code: e.target.value.toUpperCase() })} />
                <button type="button" className="mini-btn" onClick={() => setEditing({ ...editing, checkin_code: makeCheckinCode(editing.full_name) })}>{t.generateCode}</button>
              </div>
            </div>
            <div className="field"><label>{t.phone}</label><input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div className="field"><label>{t.travelingFrom}</label><input value={editing.travel_from || ""} onChange={(e) => setEditing({ ...editing, travel_from: e.target.value })} /></div>
            <div className="field"><label>{t.additionalGuests}</label><textarea value={editing.additional_guests || ""} onChange={(e) => setEditing({ ...editing, additional_guests: e.target.value })} /></div>
            <div className="field"><label>{t.confirmedGroup}</label><textarea value={editing.confirmed_guests || ""} onChange={(e) => setEditing({ ...editing, confirmed_guests: e.target.value })} /></div>
            <div className="field"><label>{t.comments}</label><textarea value={editing.comments || ""} onChange={(e) => setEditing({ ...editing, comments: e.target.value })} /></div>
 
            <div className="actions">
              <button className="btn" type="submit" disabled={loading}>{loading ? <span className="loader" /> : t.save}</button>
              <button className="btn secondary" type="button" onClick={() => setEditing(null)}>{t.cancel}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
