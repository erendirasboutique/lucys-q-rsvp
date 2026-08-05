import './globals.css';

export const metadata = {
  title: "Lucy's Quinceañera",
  description: "A luxury quinceañera guest experience for Lucy's celebration.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
