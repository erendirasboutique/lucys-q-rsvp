// The text that sends each guest their personal link. Shared by the admin preview and the server.
// Placeholders: {nombre} or {name} = first name, {dias} or {days} = days until the quince, {link} = their private link.

export const QUINCE_DATE = "2027-01-04";

export const LINK_TEXT_PRESETS = {
  full: {
    label: "Full message",
    es: "¡Hola {nombre}! Faltan {dias} días para la Quinceañera de Lucy (4 de enero, Rincón de Guayabitos). Es buen momento para tener listos tus vuelos, hotel y transporte.\n\nEsta es tu página personal: {link}\nAhí puedes ver o cambiar tu reservación, ver los detalles del evento y mandarnos un mensaje. Es solo para ti, por favor no la compartas.\n\nEn las próximas semanas les compartiremos más información y novedades. ¡Te esperamos!\n— Familia de Lucy",
    en: "Hi {name}! Lucy's Quinceañera is {days} days away (January 4, Rincón de Guayabitos). Now's a great time to lock in your flights, hotel and transportation.\n\nHere's your personal page: {link}\nYou can view or update your reservation, see event details and send us a message. It's just for you, so please don't share it.\n\nMore info and updates are coming in the next few weeks. We can't wait to see you!\n— Lucy's family",
  },
  short: {
    label: "Short message (costs less)",
    es: "¡Hola {nombre}! Faltan {dias} días para la Quinceañera de Lucy. Asegura tus vuelos, hotel y transporte. Tu página personal para ver tu reservación y los detalles del evento: {link} Pronto más novedades. — Familia de Lucy",
    en: "Hi {name}! Lucy's Quinceañera is {days} days away. Lock in your flights, hotel and transportation. Your personal page to see your reservation and event details: {link} More updates soon. — Lucy's family",
  },
};

export const DEFAULT_LINK_TEXT = { es: LINK_TEXT_PRESETS.full.es, en: LINK_TEXT_PRESETS.full.en };

export function daysUntil(date = QUINCE_DATE) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia_Banderas" }).format(new Date());
  return Math.max(0, Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5));
}

const firstNameOf = (full) => String(full || "").trim().split(/\s+/)[0] || "";

// Picks Spanish or English for this guest and fills in the placeholders.
export function renderLinkText(template, rsvp, link, date = QUINCE_DATE) {
  const t = template && template.es ? template : DEFAULT_LINK_TEXT;
  const english = rsvp?.preferred_language === "en" && String(t.en || "").trim();
  let text = english ? t.en : t.es;
  if (!/\{link\}/i.test(text)) text += " {link}";
  const name = firstNameOf(rsvp?.full_name);
  return text
    .replace(/\{\s*(nombre|name)\s*\}/gi, name)
    .replace(/\{\s*(d[ií]as|days)\s*\}/gi, String(daysUntil(date)))
    .replace(/\{\s*link\s*\}/gi, link)
    .replace(/¡Hola !/g, "¡Hola!")
    .replace(/Hi !/g, "Hi!");
}

// How many SMS segments Twilio will bill for this text.
export function smsSegments(message) {
  const basic = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const extended = "^{}\\[~]|€";
  let units = 0;
  for (const ch of message) {
    if (basic.includes(ch)) units++;
    else if (extended.includes(ch)) units += 2;
    else {
      const n = [...message].reduce((a, c) => a + (c.codePointAt(0) > 65535 ? 2 : 1), 0);
      return { encoding: "Unicode", segments: n <= 70 ? 1 : Math.ceil(n / 67), length: n };
    }
  }
  return { encoding: "GSM-7", segments: units <= 160 ? 1 : Math.ceil(units / 153), length: units };
}
