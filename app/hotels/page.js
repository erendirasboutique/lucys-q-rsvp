import { PageShell, Hero, Section, Cards, Placeholder } from '../components';
import { hotels } from '../data';

export default function Page(){
  return (
    <PageShell>
      <Hero
        eyebrow="Recommended Hotels"
        title="Stay in Guayabitos"
        text="Hotel and stay ideas for guests traveling to Rincón de Guayabitos, Nayarit, Mexico for Lucy's celebration."
      />

      <Section kicker="Where to Stay" title="Recommended Hotels">
        <p className="leadText">These options are meant to help guests compare resort-style stays, simple hotels, and vacation rentals near Rincón de Guayabitos. Prices and availability can change, so guests should book directly or through their preferred travel site.</p>
        <Cards items={hotels}/>
      </Section>

      <Section kicker="Best For Families" title="How to Choose">
        <div className="infoGrid">
          <div className="infoPanel"><h3>Resort Stay</h3><p>Best for families who want meals, beach time, pools, and activities in one place.</p></div>
          <div className="infoPanel"><h3>Hotel Stay</h3><p>Best for guests who mainly need a clean, convenient place close to town and the beach.</p></div>
          <div className="infoPanel"><h3>Vacation Rental</h3><p>Best for larger groups who want a kitchen, more bedrooms, and extra space.</p></div>
        </div>
      </Section>

      <Section kicker="Booking Tips" title="Before You Reserve">
        <div className="tipList">
          <p>Confirm whether parking, breakfast, beach access, and air conditioning are included.</p>
          <p>Check cancellation policies in case travel plans change.</p>
          <p>If traveling with family, compare the total cost of one rental house versus multiple hotel rooms.</p>
          <p>Book early because January is a popular time to travel along the coast.</p>
        </div>
      </Section>

      <Section kicker="Map Placeholder" title="Hotel Map Coming Soon">
        <Placeholder label="Add a map image or embedded map of recommended hotels" />
      </Section>
    </PageShell>
  )
}
