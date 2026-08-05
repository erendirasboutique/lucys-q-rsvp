'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PageShell, Section, Cards, Placeholder } from './components';
import { schedule, site } from './data';

export default function Home(){
  const [opened,setOpened]=useState(false);
  if(!opened) return <main className="inviteGate"><div className="inviteCard"><p className="kicker">You are invited</p><img src="/logo.png" alt="Lucy's Quinceañera"/><p>January 4, 2027 · Rincón de Guayabitos, Nayarit</p><button className="glassBtn inviteOpen" onClick={()=>setOpened(true)}>Open the invitation</button><small>Interactive experience preview</small></div></main>;
  return <PageShell>
    <section className="hero"><div className="heroGlass"><p className="eyebrow">A celebration by the sea</p><h1>Lucy is turning fifteen.</h1><p>Explore the celebration and enter a redesigned personalized guest experience.</p><div className="heroActions"><Link className="glassBtn" href="/portal">Preview Guest Experience</Link><Link className="glassBtn ghost" href="/admin">Preview Hidden Admin</Link></div></div></section>
    <Section kicker="New Guest Experience" title="Personal, interactive, and elegant">
      <Cards items={[["Digital Guest Pass","A polished personalized pass with guest name, party size, table, date, and venue.","Interactive"],["Notifications","Guests can see unread announcements and important event updates.","Live Preview"],["Table Experience","Guests see a visual round-table mockup with their assigned table number.","Personalized"]]} />
    </Section>
    <Section kicker="Admin Tools" title="A full event command center">
      <Cards items={[["Drag & Drop Tables","Move parties between visual round tables using native drag and drop.","Admin"],["Printable Seating Chart","Use the browser print screen to print or save the seating plan as PDF.","PDF Ready"],["Event Updates","Compose announcements and preview how they will appear to guests.","Interactive"]]} />
    </Section>
    <Section kicker="Timeline Preview" title="A beautiful evening"><div className="timeline">{schedule.map(([time,event])=><div className="timelineItem" key={time}><strong>{time}</strong><span>{event}</span></div>)}</div></Section>
    <Section kicker="Photos & Video" title="Ready for your real media"><Placeholder label="Professional Photo / Welcome Video Placeholder" /></Section>
  </PageShell>
}
