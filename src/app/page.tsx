import { Inter } from 'next/font/google';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Nav } from '@/components/landing/Nav';
import { Roadmap } from '@/components/landing/Roadmap';
import { Closing, Principles, Vision } from '@/components/landing/Story';
import { WhoItsFor } from '@/components/landing/WhoItsFor';
import s from '@/components/landing/landing.module.css';

// Loaded here only, so the elder and family screens keep their own type.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-landing' });

export default function Home() {
  return (
    <div className={`${inter.variable} ${s.page}`}>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <WhoItsFor />
        <Vision />
        <Roadmap />
        <Principles />
      </main>
      <Closing />
    </div>
  );
}
