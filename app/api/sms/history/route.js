import {db,adminOK,apiError} from '../../../../lib/lucy-sms';
export const runtime='nodejs';
export async function POST(req){try{const {password}=await req.json();if(!adminOK(password))return Response.json({ok:false,error:'Unauthorized'},{status:401});const {data,error}=await db().from('sms_outbox').select('id,phone,status,twilio_sid,error_message,created_at,sent_at,updated_at').order('created_at',{ascending:false}).limit(500);if(error)throw error;return Response.json({ok:true,history:data||[]});}catch(e){return apiError(e)}}
