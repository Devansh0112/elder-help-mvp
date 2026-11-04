import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elder Help',
  description: 'Maya, a voice helper for older adults, with a live family dashboard.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
