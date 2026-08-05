import { PageShell, Hero, Section, Cards } from '../components';import { faqs } from '../data';
export default function Page(){return <PageShell><Hero eyebrow="FAQ" title="Questions" text="Answers to common guest questions."/><Section kicker="Helpful Info" title="Frequently asked questions"><Cards items={faqs}/></Section></PageShell>}
