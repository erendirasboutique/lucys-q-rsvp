import "./globals.css";
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "Lucy's Quinceañera RSVP",
  description: "RSVP portal for Lucy's Quinceañera",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
