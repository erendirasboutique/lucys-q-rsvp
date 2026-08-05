import { PageShell, Hero, Section, Placeholder } from '../components';

export default function Page(){
  return (
    <PageShell>
      <Hero eyebrow="Parking" title="Arrival & Parking" text="Parking details for Rincón de Guayabitos will be added closer to the event date."/>
      <Section kicker="Coming Soon" title="Parking Instructions">
        <p className="leadText">Once the final venue and arrival instructions are confirmed, this page can include the best parking area, drop-off location, accessible parking, and a map image for guests.</p>
        <div className="infoGrid">
          <div className="infoPanel"><h3>Drop-Off</h3><p>Add the recommended drop-off entrance here.</p></div>
          <div className="infoPanel"><h3>Parking</h3><p>Add main parking and overflow parking instructions here.</p></div>
          <div className="infoPanel"><h3>Arrival Tip</h3><p>Guests should plan extra time for local traffic and walking from parking to the venue.</p></div>
        </div>
      </Section>
      <Section kicker="Map" title="Parking Map Placeholder"><Placeholder label="Upload a parking map or venue entrance photo"/></Section>
    </PageShell>
  )
}
