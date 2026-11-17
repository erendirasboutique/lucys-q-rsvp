"use client";
 
import { useEffect, useState } from "react";
import SmsPanel from "./SmsPanel";
import { LinkCell, GuestPageEditor, ArrivalsPanel, InboxPanel, portalCall } from "./PortalAdmin";
import ProgramPanel from "./ProgramPanel";
import { Icon } from "../guest/ui";
 
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
 
const L = (lang, es, en) => (lang === "es" ? es : en);

function StatusPill({ value, lang }) {
  if (isYes(value)) return <span className="ad-pill ok" title={value}>{L(lang, "Confirmado", "Confirmed")}</span>;
  if (isNo(value)) return <span className="ad-pill gray" title={value}>{L(lang, "No asiste", "Not attending")}</span>;
  return <span className="ad-pill warn" title={value || ""}>{L(lang, "Pendiente", "Pending")}</span>;
}

export default function AdminPage() {
  const [lang, setLang] = useState("es");
  const [tab, setTab] = useState("guests");
  const [tableDraft, setTableDraft] = useState("");
  const t = text[lang];

  const [password, setPassword] = useState("");
  const [rsvps, setRsvps] = useState([]);
  const [unlocked, setUnlocked] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [checkinSearch, setCheckinSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [portal, setPortal] = useState(null);
  const [portalError, setPortalError] = useState("");
  const [dragOver, setDragOver] = useState(null);

  // Toast messages disappear on their own.
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(id);
  }, [message]);

  // Stay signed in while this browser tab is open.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("lq_admin_pw");
      const savedLang = localStorage.getItem("lq_admin_lang");
      if (savedLang === "en" || savedLang === "es") setLang(savedLang);
      if (saved) openDashboard(saved, true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeLang(l) {
    setLang(l);
    try { localStorage.setItem("lq_admin_lang", l); } catch {}
  }

  async function loadPortal(pw = password) {
    try {
      const data = await portalCall(pw, "load");
      setPortal(data);
      setPortalError("");
    } catch (error) {
      setPortalError(error.message);
    }
  }

  async function refreshList(pw = password) {
    const res = await fetch("/api/admin-rsvps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const data = await res.json();
    if (res.ok && data.ok) setRsvps(data.rsvps || []);
  }

  async function reloadPortalAndList() {
    await Promise.all([loadPortal(), refreshList()]);
  }

  function updateRsvp(row) {
    if (!row?.id) return;
    setRsvps((rows) => rows.map((r) => (r.id === row.id ? row : r)));
    setEditing((e) => (e && e.id === row.id ? { ...e, ...row } : e));
  }

  async function openDashboard(pw, silent = false) {
    setLoading(true);
    if (!silent) setMessage("");
    try {
      const res = await fetch("/api/admin-rsvps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t.couldNotOpen);
      setPassword(pw);
      setRsvps(data.rsvps || []);
      setUnlocked(true);
      try { sessionStorage.setItem("lq_admin_pw", pw); } catch {}
      loadPortal(pw);
    } catch (error) {
      try { sessionStorage.removeItem("lq_admin_pw"); } catch {}
      if (!silent) setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    try { sessionStorage.removeItem("lq_admin_pw"); } catch {}
    setUnlocked(false);
    setPassword("");
    setRsvps([]);
    setPortal(null);
  }

  async function saveRsvp(row) {
    const res = await fetch("/api/admin-update-rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, rsvp: row }) });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || t.wrongSave);
    setRsvps((rows) => rows.map((r) => (r.id === data.rsvp.id ? data.rsvp : r)));
    return data.rsvp;
  }

  async function assignTable(rsvp, tableNumber) {
    if (!rsvp || !isYes(rsvp.attending)) return;
    try {
      await saveRsvp({ ...rsvp, table_number: tableNumber === "Unassigned" ? "" : tableNumber });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const saved = await saveRsvp(editing);
      setEditing((cur) => (cur ? { ...cur, ...saved } : cur));
      setMessage(t.updated);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRSVP(id) {
    if (!confirm(t.confirmDelete)) return;
    try {
      const res = await fetch("/api/admin-delete-rsvp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, id }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || t.wrongDelete);
      setRsvps((rows) => rows.filter((r) => r.id !== id));
      setEditing(null);
      setMessage(t.deleted);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function checkInGuest(rsvp) {
    if (!rsvp?.id) return;
    try {
      const saved = await saveRsvp({ ...rsvp, checked_in: true, checked_in_at: new Date().toISOString(), checkin_code: rsvp.checkin_code || makeCheckinCode(rsvp.full_name) });
      setMessage(t.arrivedMessage(saved.full_name));
    } catch (error) {
      setMessage(error.message || t.wrongCheckin);
    }
  }

  function openEdit(rsvp) {
    setEditing({ ...blankEdit, ...rsvp, checkin_code: rsvp.checkin_code || makeCheckinCode(rsvp.full_name) });
  }

  function exportCSV() {
    const rows = rsvps.map((r) => [r.full_name, r.attending, r.guest_count, r.phone, r.travel_from, r.table_number, r.checkin_code, r.checked_in ? t.yes : t.no, r.checked_in_at, r.additional_guests, r.confirmed_guests, r.comments, r.updated_at]);
    const csv = [t.csvHeaders, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "lucys-quince-rsvps.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const status = (r) => (isYes(r.attending) ? "yes" : isNo(r.attending) ? "no" : "pending");
  const filtered = rsvps
    .filter((r) => filter === "all" || (filter === "checked" ? r.checked_in : status(r) === filter))
    .filter((r) => `${r.full_name} ${r.phone} ${r.attending} ${r.travel_from} ${r.table_number} ${r.checkin_code} ${r.additional_guests || ""}`.toLowerCase().includes(search.toLowerCase()));
  const checkinMatches = checkinSearch.trim() ? rsvps.filter((r) => `${r.full_name} ${r.phone} ${r.checkin_code} ${r.table_number}`.toLowerCase().includes(checkinSearch.toLowerCase())) : [];

  const sum = (list) => list.reduce((n, r) => n + Number(r.guest_count || 0), 0);
  const yesList = rsvps.filter((r) => isYes(r.attending));
  const totalGuests = sum(rsvps);
  const attendingGuests = sum(yesList);
  const noCount = rsvps.filter((r) => status(r) === "no").length;
  const pendingCount = rsvps.filter((r) => status(r) === "pending").length;
  const checkedInGuests = sum(rsvps.filter((r) => r.checked_in));
  const unreadInbox = new Set((portal?.messages || []).filter((m) => m.sender === "guest" && !m.read_by_family_at).map((m) => m.rsvp_id)).size;

  const tableNames = [...new Set([...rsvps.map((r) => String(r.table_number || "").trim()).filter(Boolean), ...Array.from({ length: 12 }, (_, i) => String(i + 1)), tableDraft.trim()].filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const LangToggle = () => (
    <div className="ad-chips" role="group" aria-label={t.language}>
      <button type="button" aria-pressed={lang === "es"} onClick={() => changeLang("es")}>ES</button>
      <button type="button" aria-pressed={lang === "en"} onClick={() => changeLang("en")}>EN</button>
    </div>
  );

  if (!unlocked) {
    return (
      <main className="ad">
        <section className="ad-login">
          <form className="ad-card" onSubmit={(e) => { e.preventDefault(); openDashboard(password); }}>
            <img src="/logo.png" alt="Lucy's Quinceañera" />
            <div className="ad-between">
              <span className="ad-pill dark">Admin</span>
              <LangToggle />
            </div>
            <div className="ad-field" style={{ gap: 4 }}>
              <h1 style={{ fontSize: 28 }}>{t.adminDashboard}</h1>
              <p className="ad-muted">{t.loginIntro}</p>
            </div>
            <div className="ad-field">
              <label htmlFor="ad-pw">{t.password}</label>
              <input id="ad-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="ad-btn" type="submit" disabled={loading} style={{ minHeight: 48, fontSize: 16 }}>{loading ? t.opening : t.enterDashboard}</button>
            {message && <div className="ad-notice" role="alert">{message}</div>}
          </form>
        </section>
      </main>
    );
  }

  const TABS = [
    ["guests", L(lang, "Invitados y Check-In", "Guests & Check-In")],
    ["seating", L(lang, "Mesas", "Seating")],
    ["arrivals", L(lang, "Llegadas", "Arrivals")],
    ["program", "Programa"],
    ["inbox", L(lang, "Mensajes de invitados", "Guest messages"), unreadInbox],
    ["messages", "SMS"],
  ];

  return (
    <main className="ad">
      <div className="ad-wrap">
        <header className="ad-top no-print">
          <div className="ad-brand">
            <img src="/logo.png" alt="Lucy's Quinceañera" />
            <span className="ad-pill dark">Admin</span>
          </div>
          <div className="ad-tools">
            <LangToggle />
            <button type="button" className="ad-btn ghost small" onClick={() => reloadPortalAndList().then(() => setMessage(L(lang, "Actualizado.", "Refreshed.")))}><Icon name="refresh" size={16} />{t.refresh}</button>
            <button type="button" className="ad-btn ghost small" onClick={signOut}><Icon name="out" size={16} />{L(lang, "Salir", "Sign out")}</button>
          </div>
        </header>

        <nav className="ad-tabs no-print" aria-label="Admin sections">
          {TABS.map(([id, label, count]) => (
            <button key={id} type="button" aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
              {label}{count > 0 && <span className="ad-count">{count}</span>}
            </button>
          ))}
        </nav>

        {tab === "guests" && (
          <>
            <div className="ad-head">
              <div>
                <h1>{L(lang, "Invitados y Check-In", "Guests & Check-In")}</h1>
                <p className="ad-muted">{t.overviewIntro}</p>
              </div>
            </div>

            <section className="ad-stats" aria-label="Summary">
              <div className="ad-stat"><strong>{rsvps.length}</strong><span>{t.totalRsvps}</span></div>
              <div className="ad-stat"><strong>{totalGuests}</strong><span>{t.totalGuests}</span></div>
              <div className="ad-stat pink"><strong>{attendingGuests}</strong><span>{t.attendingGuests}</span></div>
              <div className="ad-stat"><strong>{checkedInGuests}</strong><span>{t.checkedInGuests}</span></div>
              <div className="ad-stat"><strong>{noCount}</strong><span>{t.notAttending}</span></div>
              <div className="ad-stat"><strong>{pendingCount}</strong><span>{t.pendingOther}</span></div>
            </section>

            <section className="ad-checkin no-print">
              <div className="ad-between">
                <h2>{t.checkinMode}</h2>
                <span className="ad-pill">{checkedInGuests} / {attendingGuests} {L(lang, "llegaron", "arrived")}</span>
              </div>
              <p className="ad-muted">{t.checkinHelp}</p>
              <div className="ad-search">
                <Icon name="search" size={18} />
                <label htmlFor="ad-checkin" className="sr-only">{t.checkinMode}</label>
                <input id="ad-checkin" value={checkinSearch} onChange={(e) => setCheckinSearch(e.target.value)} placeholder={t.checkinPlaceholder} />
              </div>
              {checkinSearch && (
                <div className="ad-checkin-results">
                  {checkinMatches.length === 0 && <p className="ad-muted">{L(lang, "Nadie coincide.", "No matches.")}</p>}
                  {checkinMatches.slice(0, 9).map((r) => (
                    <div className={`ad-checkin-card ${r.checked_in ? "done" : ""}`} key={r.id}>
                      <div>
                        <strong>{r.full_name}</strong>
                        <span>{t.table} {r.table_number || "—"} · {r.guest_count} {t.guests} · {r.checkin_code || t.notCreated}</span>
                        {r.checked_in && <span>{t.arrived}: {formatDate(r.checked_in_at)}</span>}
                      </div>
                      {r.checked_in ? <span className="ad-pill ok">{t.arrived}</span> : <button type="button" className="ad-btn small" onClick={() => checkInGuest(r)}>{t.markArrived}</button>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="ad-card">
              <div className="ad-row ad-toolbar no-print">
                <div className="ad-search">
                  <Icon name="search" size={18} />
                  <label htmlFor="ad-search" className="sr-only">{t.searchPlaceholder}</label>
                  <input id="ad-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} />
                </div>
                <button type="button" className="ad-btn ghost small" onClick={() => window.print()}><Icon name="printer" size={16} />{t.print}</button>
                <button type="button" className="ad-btn ghost small" onClick={exportCSV}><Icon name="download" size={16} />{t.exportCSV}</button>
              </div>
              <div className="ad-chips no-print" role="group" aria-label="Filter">
                {[["all", L(lang, "Todos", "All"), rsvps.length], ["yes", L(lang, "Confirmados", "Confirmed"), yesList.length], ["pending", L(lang, "Pendientes", "Pending"), pendingCount], ["no", L(lang, "No asisten", "Not attending"), noCount], ["checked", L(lang, "Llegaron", "Arrived"), rsvps.filter((r) => r.checked_in).length]].map(([id, label, n]) => (
                  <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label} · {n}</button>
                ))}
              </div>
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>{t.name}</th>
                      <th>{t.status}</th>
                      <th>{t.guests}</th>
                      <th>{t.table}</th>
                      <th>Check-in</th>
                      <th className="no-print">{L(lang, "Página del invitado", "Guest page")}</th>
                      <th className="no-print"><span className="sr-only">{t.actions}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td className="ad-name">
                          <strong>{r.full_name}</strong>
                          <span>{r.phone}{r.travel_from ? ` · ${r.travel_from}` : ""}</span>
                          {(r.additional_guests || r.confirmed_guests) && <em title={r.additional_guests || r.confirmed_guests}>{String(r.additional_guests || r.confirmed_guests).replace(/\n/g, ", ")}</em>}
                          {r.comments && <em title={r.comments}>“{r.comments}”</em>}
                        </td>
                        <td data-label={t.status}><StatusPill value={r.attending} lang={lang} /></td>
                        <td data-label={t.guests}>{r.guest_count}</td>
                        <td data-label={t.table}>{r.table_number ? <span className="ad-tablenum">{r.table_number}</span> : <span className="ad-muted">—</span>}</td>
                        <td data-label="Check-in">
                          <div className="ad-field" style={{ gap: 4 }}>
                            <span className="ad-small">{r.checkin_code || t.notCreated}</span>
                            {r.checked_in ? <span className="ad-pill ok" title={formatDate(r.checked_in_at)}>{t.arrived}</span> : isYes(r.attending) ? <button type="button" className="mini-btn no-print" onClick={() => checkInGuest(r)}>{t.markArrived}</button> : null}
                          </div>
                        </td>
                        <td className="no-print" data-label={L(lang, "Página del invitado", "Guest page")}><LinkCell r={r} portal={portal} password={password} onNotice={setMessage} /></td>
                        <td className="no-print">
                          <button type="button" className="ad-icon-btn" aria-label={`${t.edit} ${r.full_name}`} title={t.edit} onClick={() => openEdit(r)}><Icon name="edit" size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <p className="ad-muted" style={{ padding: 16 }}>{L(lang, "No hay invitados en esta vista.", "No guests in this view.")}</p>}
              </div>
            </section>
          </>
        )}

        {tab === "seating" && (
          <>
            <div className="ad-head">
              <div>
                <h1>{L(lang, "Mesas", "Seating")}</h1>
                <p className="ad-muted">{L(lang, "Arrastra cada grupo confirmado a una mesa, o elige la mesa en la lista. Se guarda solo.", "Drag each confirmed party onto a table, or pick the table from the list. Saves automatically.")}</p>
              </div>
              <div className="ad-row no-print">
                <div className="ad-field" style={{ width: 160 }}>
                  <label htmlFor="ad-newtable">{L(lang, "Agregar mesa", "Add table")}</label>
                  <input id="ad-newtable" value={tableDraft} onChange={(e) => setTableDraft(e.target.value.replace(/[^0-9A-Za-z -]/g, ""))} placeholder="13" />
                </div>
                <button type="button" className="ad-btn ghost small" style={{ alignSelf: "flex-end" }} onClick={() => window.print()}><Icon name="printer" size={16} />{t.print}</button>
              </div>
            </div>
            <div className="ad-stats" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <div className="ad-stat pink"><strong>{sum(yesList.filter((r) => r.table_number))}</strong><span>{L(lang, "invitados con mesa", "guests seated")}</span></div>
              <div className="ad-stat"><strong>{sum(yesList.filter((r) => !r.table_number))}</strong><span>{L(lang, "invitados sin mesa", "guests without a table")}</span></div>
              <div className="ad-stat"><strong>{tableNames.filter((n) => yesList.some((r) => String(r.table_number) === n)).length}</strong><span>{L(lang, "mesas en uso", "tables in use")}</span></div>
            </div>
            <div className="ad-seat-grid">
              {[...tableNames, "Unassigned"].map((table) => {
                const parties = yesList.filter((r) => (String(r.table_number || "") || "Unassigned") === table);
                return (
                  <div
                    key={table}
                    className={`ad-seat ${dragOver === table ? "over" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(table); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(null); const guest = rsvps.find((r) => String(r.id) === e.dataTransfer.getData("text/plain")); if (guest) assignTable(guest, table); }}
                  >
                    <div className="ad-seat-head">
                      <span className="ad-seat-circle">{table === "Unassigned" ? "?" : table}</span>
                      <div className="ad-field" style={{ gap: 0 }}>
                        <strong>{table === "Unassigned" ? L(lang, "Sin mesa", "Unassigned") : `${L(lang, "Mesa", "Table")} ${table}`}</strong>
                        <span className="ad-muted ad-small">{sum(parties)} {t.guests}</span>
                      </div>
                    </div>
                    {parties.map((r) => (
                      <div className="ad-party" key={r.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(r.id))}>
                        <div className="ad-between"><strong className="ad-small">{r.full_name}</strong><span className="ad-pill pink">{r.guest_count}</span></div>
                        <select aria-label={`${L(lang, "Mesa para", "Table for")} ${r.full_name}`} value={r.table_number || "Unassigned"} onChange={(e) => assignTable(r, e.target.value)}>
                          {[...tableNames, "Unassigned"].map((x) => <option key={x} value={x}>{x === "Unassigned" ? L(lang, "Sin mesa", "Unassigned") : `${L(lang, "Mesa", "Table")} ${x}`}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {["arrivals", "program", "inbox"].includes(tab) && !portal && (
          <div className="ad-notice">{portalError ? `${portalError} — run sql/02-guest-portal.sql in Supabase, then Refresh.` : L(lang, "Cargando…", "Loading…")}</div>
        )}
        {tab === "arrivals" && portal && (
          <>
            <div className="ad-head"><div><h1>{L(lang, "Llegadas", "Arrivals")}</h1><p className="ad-muted">{L(lang, "Quién llega cuándo, traslados y anuncios para los invitados.", "Who lands when, shuttles, and announcements for guests.")}</p></div></div>
            <ArrivalsPanel rsvps={rsvps} portal={portal} password={password} reloadPortal={reloadPortalAndList} updateRsvp={updateRsvp} onNotice={setMessage} />
          </>
        )}
        {tab === "program" && portal && <ProgramPanel rsvps={rsvps} portal={portal} password={password} reloadPortal={reloadPortalAndList} updateRsvp={updateRsvp} onNotice={setMessage} goTab={setTab} />}
        {tab === "inbox" && portal && (
          <>
            <div className="ad-head"><div><h1>{L(lang, "Mensajes de invitados", "Guest messages")}</h1><p className="ad-muted">{L(lang, "Lo que los invitados te escriben desde su página.", "What guests write to you from their page.")}</p></div></div>
            <InboxPanel rsvps={rsvps} portal={portal} password={password} reloadPortal={loadPortal} onNotice={setMessage} />
          </>
        )}
        {tab === "messages" && (
          <>
            <div className="ad-head"><div><h1>SMS</h1><p className="ad-muted">{L(lang, "Recordatorios y mensajes a uno o varios invitados.", "Reminders and messages to one or more guests.")}</p></div></div>
            <SmsPanel adminPassword={password} />
          </>
        )}
      </div>

      {message && (
        <div className="ad-toast" role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")}>{L(lang, "Cerrar", "Close")}</button>
        </div>
      )}

      {editing && (
        <div className="ad-drawer-bg no-print" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <aside className="ad-drawer" aria-label={t.editTitle}>
            <div className="ad-between">
              <div className="ad-field" style={{ gap: 2 }}>
                <span className="ad-eyebrow">{t.editTitle}</span>
                <h2>{editing.full_name || "—"}</h2>
              </div>
              <button type="button" className="ad-icon-btn" aria-label={L(lang, "Cerrar", "Close")} onClick={() => setEditing(null)}><Icon name="x" size={18} /></button>
            </div>

            <form className="ad-card" onSubmit={saveEdit}>
              <h3>RSVP</h3>
              <div className="ad-field"><label htmlFor="e-name">{t.name}</label><input id="e-name" value={editing.full_name || ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} /></div>
              <div className="ad-form2">
                <div className="ad-field"><label htmlFor="e-att">{t.attending}</label><input id="e-att" value={editing.attending || ""} onChange={(e) => setEditing({ ...editing, attending: e.target.value })} /></div>
                <div className="ad-field"><label htmlFor="e-count">{t.guestCount}</label><input id="e-count" type="number" min="1" value={editing.guest_count || 1} onChange={(e) => setEditing({ ...editing, guest_count: Number(e.target.value) })} /></div>
                <div className="ad-field"><label htmlFor="e-table">{t.tableNumber}</label><input id="e-table" value={editing.table_number || ""} onChange={(e) => setEditing({ ...editing, table_number: e.target.value })} /></div>
                <div className="ad-field">
                  <label htmlFor="e-code">{t.checkinCode}</label>
                  <div className="ad-row" style={{ flexWrap: "nowrap" }}>
                    <input id="e-code" value={editing.checkin_code || ""} onChange={(e) => setEditing({ ...editing, checkin_code: e.target.value.toUpperCase() })} />
                    <button type="button" className="ad-icon-btn" aria-label={t.generateCode} title={t.generateCode} onClick={() => setEditing({ ...editing, checkin_code: makeCheckinCode(editing.full_name) })}><Icon name="refresh" size={16} /></button>
                  </div>
                </div>
              </div>
              <div className="ad-field"><label htmlFor="e-phone">{t.phone}</label><input id="e-phone" value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div className="ad-field"><label htmlFor="e-from">{t.travelingFrom}</label><input id="e-from" value={editing.travel_from || ""} onChange={(e) => setEditing({ ...editing, travel_from: e.target.value })} /></div>
              <div className="ad-field"><label htmlFor="e-add">{t.additionalGuests}</label><textarea id="e-add" rows={3} value={editing.additional_guests || ""} onChange={(e) => setEditing({ ...editing, additional_guests: e.target.value })} /></div>
              <div className="ad-field"><label htmlFor="e-conf">{t.confirmedGroup}</label><textarea id="e-conf" rows={2} value={editing.confirmed_guests || ""} onChange={(e) => setEditing({ ...editing, confirmed_guests: e.target.value })} /></div>
              <div className="ad-field"><label htmlFor="e-com">{t.comments}</label><textarea id="e-com" rows={2} value={editing.comments || ""} onChange={(e) => setEditing({ ...editing, comments: e.target.value })} /></div>
              <label className="ad-check"><input type="checkbox" checked={Boolean(editing.checked_in)} onChange={(e) => setEditing({ ...editing, checked_in: e.target.checked, checked_in_at: e.target.checked ? editing.checked_in_at || new Date().toISOString() : null })} />{t.arrived}</label>
              <div className="ad-row">
                <button className="ad-btn" type="submit" disabled={loading}>{loading ? t.opening : t.save}</button>
                <button className="ad-btn ghost" type="button" onClick={() => setEditing(null)}>{t.cancel}</button>
              </div>
            </form>

            {editing.id && <GuestPageEditor key={editing.id + (editing.access_token || "")} rsvp={editing} portal={portal} password={password} onSaved={updateRsvp} onNotice={setMessage} />}

            {editing.id && (
              <section className="ad-card">
                <h3>{L(lang, "Borrar RSVP", "Delete RSVP")}</h3>
                <p className="ad-muted">{L(lang, "Esto borra al invitado y su página. No se puede deshacer.", "This removes the guest and their page. It can't be undone.")}</p>
                <button type="button" className="ad-btn danger" style={{ alignSelf: "flex-start" }} onClick={() => deleteRSVP(editing.id)}><Icon name="trash" size={16} />{t.delete}</button>
              </section>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
