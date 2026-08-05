import Link from 'next/link';
import { nav, site } from './data';

export function Petals(){ return <><div className="sparkles"/><div className="petals">{Array.from({length:16}).map((_,i)=><span key={i}/>)}</div></> }
export function Header(){return <header className="topbar"><Link href="/" className="brand"><img src="/logo.png" alt="Lucy's Quinceañera"/></Link><nav>{nav.map(([n,h])=><Link key={h} href={h}>{n}</Link>)}</nav><a className="glassBtn small" href={site.rsvpUrl}>RSVP Portal</a></header>}
export function Footer(){return <footer className="footer"><div className="thin"/><img src="/logo.png" alt="Lucy's Quinceañera"/><p>With love, Lucy's Quinceañera</p><div><a href={site.mainUrl}>Home</a><a href={site.rsvpUrl}>Manage RSVP</a><a href="/contact">Contact</a></div></footer>}
export function PageShell({children}){return <main><Petals/><Header/>{children}<Footer/></main>}
export function Hero({eyebrow='January 4, 2027',title="Lucy's Quinceañera",text='A beautiful celebration filled with family, love, music, and memories.'}){return <section className="hero"><div className="heroGlass"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p><div className="heroActions"><a className="glassBtn" href={site.rsvpUrl}>Open RSVP Portal</a><Link className="glassBtn ghost" href="/event-details">Event Details</Link></div></div></section>}
export function Section({kicker,title,children}){return <section className="section reveal"><p className="kicker">{kicker}</p><h2>{title}</h2>{children}</section>}
export function Cards({items}){return <div className="cards">{items.map((item,i)=><div className="card" key={i}><h3>{item[0]}</h3><p>{item[1]}</p>{item[2]&&<span>{item[2]}</span>}</div>)}</div>}
export function Placeholder({label='Photo / Video Placeholder'}){return <div className="placeholder"><span>{label}</span></div>}
