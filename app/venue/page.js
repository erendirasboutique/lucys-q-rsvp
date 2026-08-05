import { PageShell, Hero, Section, Placeholder } from '../components';
import { site } from '../data';

export default function Page(){
  return (
    <PageShell>
      <Hero eyebrow="Venue" title="Rincón de Guayabitos" text="Lucy's celebration will take place in beautiful Rincón de Guayabitos, Nayarit, Mexico."/>
      <Section kicker="Location" title={site.venueName}>
        <p className="leadText">Rincón de Guayabitos is a beach town on the Riviera Nayarit coast, known for its calm bay, family-friendly atmosphere, and coastal views.</p>
        <div className="infoGrid">
          <div className="infoPanel"><h3>Address</h3><p>{site.venueAddress}</p></div>
          <div className="infoPanel"><h3>Airport</h3><p>Puerto Vallarta International Airport (PVR)</p></div>
          <div className="infoPanel"><h3>Drive Time</h3><p>Plan for about 1 to 1.5 hours from PVR depending on traffic and transportation.</p></div>
        </div>
        <div className="heroActions leftActions">
          <a className="glassBtn" href="https://www.google.com/maps/search/Rinc%C3%B3n+de+Guayabitos,+Nayarit,+Mexico" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
          <a className="glassBtn ghost" href="/travel">Travel Guide</a>
        </div>
      </Section>
      <Section kicker="Venue Photos" title="Photos Coming Soon"><Placeholder label="Add venue photos when available"/></Section>
    </PageShell>
  )
}
