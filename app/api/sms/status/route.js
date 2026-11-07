import twilio from 'twilio';
import {db,apiError} from '../../../../lib/lucy-sms';
export const runtime='nodejs';
export async function POST(req){
  try{
    const signature=req.headers.get('x-twilio-signature')||'';
    const raw=await req.text();
    const params=Object.fromEntries(new URLSearchParams(raw));
    const base=process.env.SMS_PUBLIC_BASE_URL;
    const token=process.env.TWILIO_AUTH_TOKEN;
    if(!base||!token)throw Error('Missing callback verification configuration');
    const url=`${base.replace(/\/$/,'')}/api/sms/status`;
    if(!twilio.validateRequest(token,signature,url,params))return new Response('Invalid signature',{status:403});
    const sid=params.MessageSid||params.SmsSid;
    const status=params.MessageStatus||params.SmsStatus;
    if(!sid||!status)return new Response('Missing fields',{status:400});
    // Only update rows whose Twilio SID matches; ignore stale transitions.
    const database=db();
    const {data:row,error:readError}=await database.from('sms_outbox').select('id,status').eq('twilio_sid',sid).maybeSingle();
    if(readError)throw readError;
    if(!row)return new Response('OK',{status:200});
    const terminal=['delivered','undelivered','failed'];
    if(terminal.includes(row.status)&&!terminal.includes(status))return new Response('OK',{status:200});
    const {error}=await database.from('sms_outbox').update({status,error_message:params.ErrorCode?`Twilio error ${params.ErrorCode}`:null,updated_at:new Date().toISOString()}).eq('id',row.id);
    if(error)throw error;
    return new Response('OK',{status:200});
  }catch(e){return apiError(e)}
}
