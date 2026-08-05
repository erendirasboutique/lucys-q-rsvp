import { PageShell, Hero, Section, Cards } from '../components';
import { transportOptions, travelTips, guayabitosThings, weekendGuide, site } from '../data';

export default function Page(){
  return (
    <PageShell>
      <Hero
        eyebrow="Travel Guide"
        title="PVR to Guayabitos"
        text="Helpful flight, airport, and transportation information for guests traveling to Rincón de Guayabitos, Nayarit."
      />

      <Section kicker="Closest Airport" title="Fly into Puerto Vallarta (PVR)">
        <div className="travelHeroCard">
          <div>
            <h3>{site.airportName}</h3>
            <p>PVR is the closest major airport for most guests traveling to Rincón de Guayabitos. Plan for about 1 to 1.5 hours by car depending on traffic, stops, and transportation type.</p>
          </div>
          <a className="glassBtn" href="https://www.google.com/maps/dir/Puerto+Vallarta+International+Airport/Rinc%C3%B3n+de+Guayabitos,+Nayarit,+Mexico" target="_blank" rel="noopener noreferrer">Open Route</a>
        </div>
      </Section>

      <Section kicker="Transportation" title="How to Get There">
        <Cards items={transportOptions}/>
      </Section>

      <Section kicker="Travel Tips" title="Before You Go">
        <Cards items={travelTips}/>
      </Section>

      <Section kicker="Route Overview" title="From PVR to Guayabitos">
        <div className="routeLine">
          <span>PVR Airport</span>
          <span>Bucerías / Riviera Nayarit</span>
          <span>Lo de Marcos Area</span>
          <span>Rincón de Guayabitos</span>
        </div>
        <p className="leadText">Most guests will travel north from Puerto Vallarta along Highway 200. If you are not familiar with the area, private transportation or a rental car booked in advance is usually the easiest option.</p>
      </Section>

      <Section kicker="Weekend Guide" title="Make It a Beach Weekend">
        <Cards items={weekendGuide}/>
      </Section>

      <Section kicker="Explore Nearby" title="Things to Do in Guayabitos">
        <Cards items={guayabitosThings}/>
      </Section>
    </PageShell>
  )
}
