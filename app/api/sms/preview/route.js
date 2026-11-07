import {db,adminOK,candidates,eligibleRows,TEMPLATE,apiError} from '../../../../lib/lucy-sms';
export const runtime='nodejs';
export async function POST(req) {
  try {
    const {password}=await req.json();
    if(!adminOK(password)) return Response.json({ok:false,error:'Unauthorized'},{status:401});
    const database=db();
    const rows=eligibleRows(await candidates(database));
    const {data:existing,error}=await database.from('sms_outbox').select('phone,status').eq('campaign_key',TEMPLATE);
    if(error) throw error;
    const blocked=new Set((existing||[]).map(x=>x.phone));
    const result=rows.map(r=>({...r,reason:r.reason || (blocked.has(r.phone)?'Already attempted (review history)':null)}));
    const eligible=result.filter(r=>!r.reason);
    const rate=Number(process.env.SMS_ESTIMATED_USD_PER_SEGMENT||0);
    return Response.json({ok:true,campaign:TEMPLATE,rows:result,eligibleCount:eligible.length,segments:eligible.reduce((a,r)=>a+r.segments,0),estimatedUsd:rate>0?+(eligible.reduce((a,r)=>a+r.segments,0)*rate).toFixed(4):null,estimateNote:'Estimate excludes carrier fees, taxes, and possible additional charges. Set SMS_ESTIMATED_USD_PER_SEGMENT to your own verified rate; Twilio actual charges may differ.'});
  }catch(e){return apiError(e)}
}
