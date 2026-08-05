'use client';
import { useState } from 'react';
import { PageShell, Section } from '../components';

const updates=[{title:'RSVP received',body:'Your response has been saved. You can return at any time to make changes.',unread:true},{title:'Travel guide available',body:'Hotels and PVR-to-Guayabitos transportation details are available on the main website.',unread:false}];
const timeline=[['4:30 PM','Guest Arrival'],['5:00 PM','Grand Entrance'],['5:30 PM','Dinner'],['6:45 PM','Traditional Dances'],['7:30 PM','Open Dance Floor'],['9:30 PM','Cake Cutting']];

export default function Portal(){
 const [tab,setTab]=useState('overview'); const [notes,setNotes]=useState(updates);
 return <PageShell><section className="portalIntro"><div><p className="kicker">Personal Guest Portal</p><h1>Welcome back, María! ✨</h1><p>We are so excited to celebrate with you in Rincón de Guayabitos.</p></div><span className="statusPill yes">Confirmed</span></section>
 <div className="portalLayout"><aside className="portalTabs">{[['overview','Overview'],['pass','Guest Pass'],['timeline','Timeline'],['updates',`Updates (${notes.filter(n=>n.unread).length})`],['edit','Edit RSVP']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</aside><section className="portalBody">
 {tab==='overview'&&<><div className="portalStats"><div><span>Status</span><strong>Confirmed</strong></div><div><span>Party Size</span><strong>3</strong></div><div className="visualTableCard"><span>Your Table</span><div className="roundTableMini"><b>12</b>{Array.from({length:8}).map((_,i)=><i key={i}/>)}</div></div></div><div className="portalPanel"><h2>Your Party</h2><div className="guestNames"><span>María Garcia</span><span>José G.</span><span>Sofía G.</span></div></div></>}
 {tab==='pass'&&<div className="passArea"><article className="digitalPass"><img src="/logo.png" alt=""/><p>Digital Guest Pass</p><h2>María Garcia</h2><div className="passGrid"><div><span>Guests</span><strong>3</strong></div><div><span>Table</span><strong>12</strong></div></div><small>January 4, 2027 · Rincón de Guayabitos</small></article><button className="glassBtn" onClick={()=>window.print()}>Print / Save Pass</button></div>}
 {tab==='timeline'&&<div className="portalPanel"><h2>Event Timeline</h2><div className="eventTimeline">{timeline.map(([time,event])=><div key={time}><strong>{time}</strong><i/><span>{event}</span></div>)}</div></div>}
 {tab==='updates'&&<div className="portalPanel"><div className="panelTop"><h2>Event Updates</h2><button onClick={()=>setNotes(notes.map(n=>({...n,unread:false})))}>Mark all read</button></div>{notes.map((n,i)=><div className={n.unread?'notice unread':'notice'} key={i}><i/><div><h3>{n.title}</h3><p>{n.body}</p></div></div>)}</div>}
 {tab==='edit'&&<div className="portalPanel"><h2>Update Your RSVP</h2><form className="editForm" onSubmit={e=>{e.preventDefault();alert('Mockup saved!')}}><label>Attendance<select defaultValue="Confirmed"><option>Confirmed</option><option>Maybe</option><option>Declined</option></select></label><label>Guest Count<input type="number" defaultValue="3" min="1"/></label><label>Questions or Comments<textarea/></label><button className="glassBtn">Save Changes</button></form></div>}
 </section></div></PageShell>
}
