import {db,adminOK,candidates,eligibleRows,TEMPLATE,client,apiError,safeError} from '../../../../lib/lucy-sms';
export const runtime='nodejs';
export async function POST(req) {
  try {
    const {password,confirmation,dryRun}=await req.json();
    if(!adminOK(password)) return Response.json({ok:false,error:'Unauthorized'},{status:401});
    if(confirmation!=='SEND TRAVEL REMINDER') return Response.json({ok:false,error:'Type exact confirmation phrase'},{status:400});
    const database=db();
    const rows=eligibleRows(await candidates(database)).filter(r=>!r.reason);
    const {data:previous,error:previousError}=await database.from('sms_outbox').select('phone').eq('campaign_key',TEMPLATE);
    if(previousError) throw previousError;
    const attempted=new Set((previous||[]).map(x=>x.phone));
    const pending=rows.filter(r=>!attempted.has(r.phone));
    if(dryRun) return Response.json({ok:true,dryRun:true,count:pending.length});
    const sender=client();
    const base=process.env.SMS_PUBLIC_BASE_URL;
    if(!base || !/^https:\/\//.test(base)) throw Error('SMS_PUBLIC_BASE_URL must be an HTTPS URL');
    let sent=0,skipped=0,failed=0;
    // Server-side cap prevents a single accidental unlimited bulk send.
    for(const r of pending.slice(0,25)) {
      // Atomic reservation through unique(campaign_key,phone). No overwrite on conflict.
      const {data:reserved,error:reserveError}=await database.from('sms_outbox').insert({campaign_key:TEMPLATE,rsvp_id:r.id,phone:r.phone,message:r.message,status:'reserved'}).select('id').maybeSingle();
      if(reserveError) {
        if(reserveError.code==='23505') {skipped++;continue;}
        throw reserveError;
      }
      try {
        const message=await sender.messages.create({to:r.phone,messagingServiceSid:process.env.TWILIO_MESSAGING_SERVICE_SID,body:r.message,statusCallback:`${base.replace(/\/$/,'')}/api/sms/status`});
        const {error:updateError}=await database.from('sms_outbox').update({twilio_sid:message.sid,status:message.status||'queued',sent_at:new Date().toISOString()}).eq('id',reserved.id);
        if(updateError) throw updateError;
        sent++;
      } catch(e) {
        // If Twilio accepted but DB update failed, do not retry automatically: avoid duplicates.
        await database.from('sms_outbox').update({status:'needs_review',error_message:safeError(e)}).eq('id',reserved.id);
        failed++;
      }
    }
    return Response.json({ok:true,submitted:sent,needsReview:failed,duplicatesSkipped:skipped,batchLimit:25,remainingCandidates:Math.max(0,pending.length-25),note:'Refresh preview before sending the next batch. A Twilio accepted status does not mean delivered.'});
  }catch(e){return apiError(e)}
}
