import crypto from 'node:crypto';
import {db,adminOK,candidates,eligibleRows,client,segments,apiError,safeError} from '../../../../lib/lucy-sms';
export const runtime='nodejs';
const validId=(v)=>typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i.test(v);
export async function POST(req){
 try{
  const {password,action,requestId,recipientIds,message,confirmation}=await req.json();
  if(!adminOK(password))return Response.json({ok:false,error:'Unauthorized'},{status:401});
  if(!['preview','send'].includes(action))return Response.json({ok:false,error:'Invalid action'},{status:400});
  if(!Array.isArray(recipientIds)||recipientIds.length<1||recipientIds.length>25||recipientIds.some(id=>typeof id!=='string'))return Response.json({ok:false,error:'Select 1–25 recipients'},{status:400});
  if(new Set(recipientIds).size!==recipientIds.length)return Response.json({ok:false,error:'Duplicate guest selection'},{status:400});
  if(typeof message!=='string'||!message.trim()||message.length>1200||/\[[^\]]+\]/.test(message))return Response.json({ok:false,error:'Enter a message and replace all bracketed placeholders'},{status:400});
  if(!validId(requestId))return Response.json({ok:false,error:'Invalid send request ID'},{status:400});
  const database=db();
  const eligible=eligibleRows(await candidates(database)).filter(r=>!r.reason);
  const ids=new Set(recipientIds);
  const chosen=eligible.filter(r=>ids.has(String(r.id)));
  if(chosen.length!==recipientIds.length)return Response.json({ok:false,error:'Some selected guests are not confirmed, opted in, or have invalid numbers'},{status:400});
  const phones=new Set();
  const rows=chosen.map(r=>({id:r.id,name:r.name,phone:r.phone,message:message.replaceAll('{nombre}',String(r.name||'Invitado').trim().split(/\s+/)[0])}));
  if(rows.some(r=>{if(phones.has(r.phone))return true;phones.add(r.phone);return false;}))return Response.json({ok:false,error:'Multiple guests share a phone. Select one per phone.'},{status:400});
  const segmentCount=rows.reduce((sum,r)=>sum+segments(r.message).segments,0);
  const rate=Number(process.env.SMS_ESTIMATED_USD_PER_SEGMENT);
  const hasRate=process.env.SMS_ESTIMATED_USD_PER_SEGMENT!==undefined&&Number.isFinite(rate)&&rate>0;
  if(action==='preview')return Response.json({ok:true,rows,count:rows.length,segments:segmentCount,estimatedUsd:hasRate?Number((segmentCount*rate).toFixed(2)):null});
  if(confirmation!=='SEND CUSTOM SMS')return Response.json({ok:false,error:'Type SEND CUSTOM SMS to confirm'},{status:400});
  const base=process.env.SMS_PUBLIC_BASE_URL;
  if(!base||!/^https:\/\//.test(base))throw Error('SMS_PUBLIC_BASE_URL must be HTTPS');
  const tw=client();
  const campaignKey=`custom-${requestId}`;
  let submitted=0,needsReview=0,duplicatesSkipped=0;
  for(const r of rows){
   const {data:reserved,error}=await database.from('sms_outbox').insert({campaign_key:campaignKey,rsvp_id:r.id,phone:r.phone,message:r.message,status:'reserved'}).select('id').single();
   if(error){if(error.code==='23505'){duplicatesSkipped++;continue;}throw error;}
   try{
    const sent=await tw.messages.create({to:r.phone,messagingServiceSid:process.env.TWILIO_MESSAGING_SERVICE_SID,body:r.message,statusCallback:`${base.replace(/\/$/,'')}/api/sms/status`});
    const {error:updateError}=await database.from('sms_outbox').update({twilio_sid:sent.sid,status:sent.status||'queued',sent_at:new Date().toISOString()}).eq('id',reserved.id);
    if(updateError)throw updateError;
    submitted++;
   }catch(e){await database.from('sms_outbox').update({status:'needs_review',error_message:safeError(e)}).eq('id',reserved.id);needsReview++;}
  }
  return Response.json({ok:true,submitted,needsReview,duplicatesSkipped});
 }catch(e){return apiError(e)}
}
