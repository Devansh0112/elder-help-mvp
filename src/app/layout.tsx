import type { Metadata } from 'next';
import './globals.css';

const description =
  'Maya is a voice helper older adults just talk to. She books appointments, keeps track of medicine, and lets the family know when something needs a person.';

export const metadata: Metadata = {
  title: 'Elder Help: a voice helper for older adults',
  description,
  openGraph: {
    title: 'Elder Help: help for your parents, one conversation away',
    description,
    type: 'website',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
