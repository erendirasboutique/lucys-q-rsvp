import {createClient} from '@supabase/supabase-js';
import crypto from 'node:crypto';
export const cleanText=v=>String(v??'').trim();
export const normalizePhone=v=>cleanText(v).replace(/\D/g,'');
export function getSupabaseAdmin(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw Error('Supabase server environment variables missing');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
export function verifyAdmin(p){const s=process.env.ADMIN_PASSWORD;if(!s||!p)return false;const a=crypto.createHash('sha256').update(String(p)).digest(),b=crypto.createHash('sha256').update(s).digest();return crypto.timingSafeEqual(a,b)}
const secret=()=>{const s=process.env.RSVP_TOKEN_SECRET;if(!s||s.length<32)throw Error('Set RSVP_TOKEN_SECRET to a random secret at least 32 characters');return s};
export function signGuest(id){const payload=Buffer.from(JSON.stringify({id,exp:Date.now()+30*60*1000})).toString('base64url');const sig=crypto.createHmac('sha256',secret()).update(payload).digest('base64url');return payload+'.'+sig}
export function verifyGuest(token,id){try{const [p,s]=String(token||'').split('.');if(!p||!s)return false;const expected=crypto.createHmac('sha256',secret()).update(p).digest();const actual=Buffer.from(s,'base64url');if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return false;const data=JSON.parse(Buffer.from(p,'base64url').toString());return data.id===id&&Date.now()<data.exp}catch{return false}}
export const publicRSVP='id,full_name,phone,travel_from,attending,guest_count,additional_guests,confirmed_guests,comments,table_number,checkin_code,checked_in,checked_in_at,updated_at';
