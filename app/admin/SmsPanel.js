'use client';
import {useState} from 'react';
const btn={border:0,borderRadius:12,padding:'12px 18px',background:'#d51a7d',color:'white',cursor:'pointer',fontWeight:700};
const input={padding:12,border:'1px solid #e9c9da',borderRadius:10,width:'100%',boxSizing:'border-box'};
const card={background:'white',border:'1px solid #f0d5e4',borderRadius:20,padding:22,marginTop:18,boxShadow:'0 6px 20px #a9537610'};
export default function SmsPanel({adminPassword}){
 const [preview,setPreview]=useState(null),[history,setHistory]=useState([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[confirm,setConfirm]=useState('');
 async function call(endpoint,payload={}){const res=await fetch('/api/sms/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:adminPassword,...payload})});const json=await res.json();if(!res.ok||!json.ok)throw Error(json.error||'Request failed');return json;}
 async function load(){setBusy(true);setNotice('');try{const [p,h]=await Promise.all([call('preview'),call('history')]);setPreview(p);setHistory(h.history);}catch(e){setNotice(e.message)}finally{setBusy(false)}}
 async function send(){setBusy(true);setNotice('');try{const d=await call('send',{confirmation:confirm});setNotice(`Submitted: ${d.submitted}. Needs review: ${d.needsReview}. Duplicates skipped: ${d.duplicatesSkipped}. ${d.note}`);setConfirm('');const [p,h]=await Promise.all([call('preview'),call('history')]);setPreview(p);setHistory(h.history);}catch(e){setNotice(e.message)}finally{setBusy(false)}}
 const eligible=preview?.rows?.filter(r=>!r.reason)||[];
 const [mode,setMode]=useState('individual');
 const [template,setTemplate]=useState('custom');
 const [customText,setCustomText]=useState('');
 const [recipientIds,setRecipientIds]=useState([]);
 const [customPreview,setCustomPreview]=useState(null);
 const [requestId,setRequestId]=useState('');
 const [customConfirm,setCustomConfirm]=useState('');
 const [search,setSearch]=useState('');
 const templates={
  custom:'',
  travel:'Hola {nombre}, recuerda revisar tus vuelos a Puerto Vallarta (PVR) y tu hospedaje para la Quinceañera de Lucy el 4 de enero de 2027. Detalles: https://lucysquinceanera.com',
  event:'Hola {nombre}, tenemos una actualización importante sobre la Quinceañera de Lucy: [escribe aquí los detalles].',
  transportation:'Hola {nombre}, información de transporte para la Quinceañera de Lucy: [escribe aquí los detalles].',
  seating:'Hola {nombre}, tenemos novedades sobre tu mesa para la Quinceañera de Lucy: [escribe aquí los detalles].',
 };
 const chooseTemplate=(key)=>{setTemplate(key);setCustomText(templates[key]);setCustomPreview(null);setRequestId('');setCustomConfirm('')};
 const changeText=(value)=>{setCustomText(value);setCustomPreview(null);setRequestId('');setCustomConfirm('')};
 const changeIds=(ids)=>{setRecipientIds(ids);setCustomPreview(null);setRequestId('');setCustomConfirm('')};
 const changeMode=(value)=>{setMode(value);changeIds([])};
 const selected=eligible.filter(r=>recipientIds.includes(String(r.id)));
 const shown=eligible.filter(r=>(r.name+' '+r.phone).toLowerCase().includes(search.toLowerCase()));
 async function previewCustom(){setBusy(true);setNotice('');try{const id=crypto.randomUUID();const p=await call('custom',{action:'preview',requestId:id,recipientIds:recipientIds,message:customText});setCustomPreview(p);setRequestId(id);setCustomConfirm('');}catch(e){setNotice(e.message)}finally{setBusy(false)}}
 async function sendCustom(){setBusy(true);setNotice('');try{const r=await call('custom',{action:'send',requestId,recipientIds,message:customText,confirmation:customConfirm});setNotice(`Submitted: ${r.submitted}; needs review: ${r.needsReview}; duplicates skipped: ${r.duplicatesSkipped}. Check history for delivery.`);setCustomPreview(null);setRequestId('');setCustomConfirm('');const h=await call('history');setHistory(h.history);}catch(e){setNotice(e.message)}finally{setBusy(false)}}
 return <div style={{minHeight:'100vh',background:'linear-gradient(145deg,#fffafc,#fce4ef)',padding:'30px 16px',color:'#5c2944',fontFamily:'inherit'}}><div style={{maxWidth:1100,margin:'auto'}}>
 <h1 style={{fontSize:36,marginBottom:4}}>Lucy's XV · SMS Center</h1><p>2-month hotel & flight reminder · Confirmed guests only · One text per phone number</p>
 <section style={card}><h2>Recipient preview</h2><button style={btn} disabled={busy} onClick={load}>{busy?'Loading…':'Load recipients & history'}</button></section>
 {notice&&<div role="status" style={{...card,borderColor:'#c66b94'}}>{notice}</div>}
 {preview&&<><section style={card}><h2>2. Recipient preview</h2><div style={{display:'flex',gap:20,flexWrap:'wrap'}}><p><b>{eligible.length}</b> eligible numbers</p><p><b>{preview.rows.length-eligible.length}</b> excluded</p><p><b>{preview.segments}</b> estimated SMS segments</p><p><b>{preview.estimatedUsd===null?'Not configured':'$'+preview.estimatedUsd.toFixed(2)}</b> estimated base SMS cost</p></div><p style={{fontSize:13,color:'#8a6578'}}>{preview.estimateNote}</p><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}><thead><tr><th>Guest</th><th>Phone</th><th>Segments</th><th>Eligibility</th></tr></thead><tbody>{preview.rows.map(r=><tr key={r.id} style={{borderTop:'1px solid #f1dce6'}}><td style={{padding:9}}>{r.name}</td><td>{r.phone||'Needs +country code'}</td><td>{r.segments}</td><td>{r.reason||'Ready'}</td></tr>)}</tbody></table></div></section>
 <section style={card}><h2>3. Personalized message example</h2><div style={{background:'#fff5fa',borderRadius:16,padding:18,whiteSpace:'pre-wrap'}}>{eligible[0]?.message||'No eligible guests. Record opt-in and valid international-format phone numbers before sending.'}</div><p>Messages are generated with each guest's first name. Message text is defined in <code>lib/lucy-sms.js</code>.</p></section>
 <section style={card}><h2>4. Send carefully</h2><p>Sending is live and may incur Twilio charges. Each click processes up to <b>25 eligible recipients</b>. Refresh after each batch. Numbers already reserved/sent are excluded; errors marked “needs_review” require investigation.</p><label>Type <b>SEND TRAVEL REMINDER</b> to confirm<input style={input} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="SEND TRAVEL REMINDER"/></label><button style={{...btn,marginTop:12}} disabled={busy||confirm!=='SEND TRAVEL REMINDER'||eligible.length===0} onClick={send}>{busy?'Sending…':`Send next batch (up to ${Math.min(25,eligible.length)} numbers)`}</button></section></>}
 {preview&&<section style={card}>
 <h2>Individual & custom messages</h2><p>Send a message to one guest or a selected group. Only confirmed guests with recorded SMS consent and a valid +1/+52 phone are shown. A custom message is a new send, even if a guest already received a different campaign.</p>
 <div className="actions"><button type="button" style={{...btn,background:mode==='individual'?'#d51a7d':'#987487'}} onClick={()=>changeMode('individual')}>One person</button><button type="button" style={{...btn,background:mode==='selected'?'#d51a7d':'#987487'}} onClick={()=>changeMode('selected')}>Selected guests (up to 25)</button></div>
 <label style={{display:'block',marginTop:14}}>Find guest<input style={input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or phone"/></label>
 <div style={{maxHeight:230,overflowY:'auto',border:'1px solid #f0d5e4',borderRadius:12,marginTop:8,padding:8}}>{shown.map(r=><label key={r.id} style={{display:'flex',alignItems:'center',gap:9,padding:8,borderBottom:'1px solid #f5e1ea'}}><input type={mode==='individual'?'radio':'checkbox'} name={mode==='individual'?'sms-recipient':undefined} checked={recipientIds.includes(String(r.id))} onChange={e=>changeIds(mode==='individual'?[String(r.id)]:e.target.checked?[...recipientIds,String(r.id)]:recipientIds.filter(id=>id!==String(r.id)))} />{r.name} — {r.phone}</label>)}{shown.length===0&&<p>No eligible guests match this search.</p>}</div>
 <p>{selected.length} selected. Each phone will receive at most one message per send.</p>
 <label>Message type<select style={input} value={template} onChange={e=>chooseTemplate(e.target.value)}><option value="custom">Custom message</option><option value="travel">Hotel & flights</option><option value="event">Event update</option><option value="transportation">Transportation</option><option value="seating">Table assignment</option></select></label>
 <p style={{fontSize:13}}>Use <code>{'{nombre}'}</code> to insert each guest's first name. Complete any [placeholder] details before sending. Add STOP instructions if required by your messaging program.</p>
 <textarea style={{...input,minHeight:125}} value={customText} onChange={e=>changeText(e.target.value)} maxLength={1200} placeholder="Hola {nombre}, ..."/>
 <button type="button" style={btn} disabled={busy||selected.length===0||!customText.trim()} onClick={previewCustom}>Preview selected messages & estimated cost</button>
 {customPreview&&<div style={{marginTop:15,padding:14,background:'#fff3f8',borderRadius:12}}><b>Ready to send: {customPreview.count} number(s)</b><p>Estimated segments: {customPreview.segments} · Estimated base cost: {customPreview.estimatedUsd===null?'Not configured':'$'+customPreview.estimatedUsd.toFixed(2)}</p><p style={{fontSize:12}}>Estimates are not Twilio quotes. Carrier fees, country rates, and taxes may differ.</p>{customPreview.rows.map(r=><div key={r.id} style={{margin:'12px 0',padding:10,background:'white',borderRadius:9}}><b>{r.name} — {r.phone}</b><p style={{whiteSpace:'pre-wrap'}}>{r.message}</p></div>)}<label>Type <b>SEND CUSTOM SMS</b> to confirm<input style={input} value={customConfirm} onChange={e=>setCustomConfirm(e.target.value)}/></label><button style={{...btn,marginTop:10}} disabled={busy||customConfirm!=='SEND CUSTOM SMS'} onClick={sendCustom}>Send {customPreview.count} message(s)</button></div>}
 </section>}
 {preview&&<section style={card}><h2>5. Message history</h2><button style={btn} disabled={busy} onClick={load}>Refresh delivery statuses</button><div style={{overflowX:'auto',marginTop:12}}><table style={{width:'100%',textAlign:'left',borderCollapse:'collapse'}}><thead><tr><th>Phone</th><th>Status</th><th>Created</th><th>Twilio SID</th><th>Error</th></tr></thead><tbody>{history.map(r=><tr key={r.id} style={{borderTop:'1px solid #f1dce6'}}><td style={{padding:8}}>{r.phone}</td><td>{r.status}</td><td>{new Date(r.created_at).toLocaleString()}</td><td style={{fontSize:11}}>{r.twilio_sid||'—'}</td><td>{r.error_message||'—'}</td></tr>)}</tbody></table></div></section>}
 </div></div>;
}
