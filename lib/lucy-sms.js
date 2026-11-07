import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import crypto from 'node:crypto';

export const TEMPLATE = 'travel-2-months-2026';
export const TEXT = (name) => `Hola ${name}! Faltan solo 2 meses para la Quinceañera de Lucy (4 de enero de 2027). Si viajan desde fuera, recuerden reservar vuelos a Puerto Vallarta (PVR) y hotel en Rincón de Guayabitos. Detalles: https://lucysquinceanera.com Responde STOP para dejar de recibir mensajes.`;
export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw Error('Missing Supabase server credentials');
  return createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false}});
}
export function adminOK(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof password !== 'string') return false;
  const a = Buffer.from(password), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a,b);
}
export function phoneE164(r) {
  const raw = String(r.phone || '').trim();
  const digits = String(r.phone_normalized || raw).replace(/\D/g,'');
  if (/^1\d{10}$/.test(digits) || /^52\d{10}$/.test(digits)) return `+${digits}`;
  if (/^\d{10}$/.test(digits)) return null; // ambiguous country: never guess
  return null;
}
export function confirmed(r) {
  const s=String(r.attending||'').toLowerCase().trim();
  return /^(si|sí|yes)(\/|$)/.test(s);
}
export function segments(message) {
  // GSM-7 basic and extension; any other character requires UCS-2.
  const basic = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const extended = '^{}\\[~]|€';
  let units=0, unicode=false;
  for(const char of message) {
    if(basic.includes(char)) units++;
    else if(extended.includes(char)) units+=2;
    else {unicode=true;break;}
  }
  if(unicode) {const n=[...message].reduce((a,ch)=>a+(ch.codePointAt(0)>65535?2:1),0);return {encoding:'UCS-2',segments:n<=70?1:Math.ceil(n/67)};}
  return {encoding:'GSM-7',segments:units<=160?1:Math.ceil(units/153)};
}
export function client() {
  const sid=process.env.TWILIO_ACCOUNT_SID, key=process.env.TWILIO_API_KEY, secret=process.env.TWILIO_API_KEY_SECRET;
  if(!sid||!key||!secret||!process.env.TWILIO_MESSAGING_SERVICE_SID) throw Error('Missing Twilio environment variables');
  return twilio(key,secret,{accountSid:sid});
}
export function safeError(e) {return String(e?.message || e || 'Unknown error').slice(0,400);}
export async function candidates(database) {
  // Supabase API default max is often 1000; paginate to avoid silently skipping people.
  const all=[];
  for(let from=0;from<10000;from+=500) {
    const {data,error}=await database.from('rsvps').select('id,full_name,phone,phone_normalized,attending,sms_opt_in,sms_opt_in_at').order('id').range(from,from+499);
    if(error) throw error;
    all.push(...data);
    if(data.length<500) break;
  }
  return all.filter(confirmed);
}
export function eligibleRows(rows) {
  const seen=new Set();
  return rows.map(r=>{
    const phone=phoneE164(r);
    let reason = !r.sms_opt_in || !r.sms_opt_in_at ? 'No recorded SMS opt-in' : !phone ? 'Phone requires country code (+1 or +52)' : null;
    if(!reason && seen.has(phone)) reason='Duplicate phone in guest list';
    if(phone) seen.add(phone);
    const name=String(r.full_name||'Invitado').trim().split(/\s+/)[0];
    const message=TEXT(name);
    return {id:r.id,name:r.full_name,phone,reason,message,...segments(message)};
  });
}
export function apiError(e) {return Response.json({ok:false,error:safeError(e)},{status:500});}
