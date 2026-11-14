// Vision, principles, and the closing call to action: plain text sections.
import { BellIcon, ShieldIcon, SparkIcon } from './Icons';
import { GitHubButton } from './Nav';
import s from './landing.module.css';

export function Vision() {
  return (
    <section id="vision" className={`${s.section} ${s.vision}`}>
      <div className={s.container}>
        <div className={s.eyebrow}>Our vision</div>
        <p className={s.visionQuote}>
          Growing older at home should feel <em>less lonely</em>, and caring from far away should feel{' '}
          <em>less worrying</em>.
        </p>
        <p className={s.body}>
          Today Maya is a helper. Next she becomes a companion: check-ins in a familiar family voice, a face that talks
          back, and small groups of friends to chat with, always clearly labelled as AI.
        </p>
      </div>
    </section>
  );
}

const BLUE = '#2450d8';
const PRINCIPLES = [
  { icon: <ShieldIcon color={BLUE} />, title: 'Always honest it’s AI', text: 'Maya says she’s an AI helper if asked. Family voices will be clearly labelled.' },
  { icon: <BellIcon color={BLUE} />, title: 'Nothing fails silently', text: 'If Maya can’t do something, she says so kindly and the family is told.' },
  { icon: <SparkIcon color={BLUE} />, title: 'Simple by design', text: 'One button, large text, high contrast. Built for people who don’t want an app.' },
];

export function Principles() {
  return (
    <section className={`${s.section} ${s.alt}`}>
      <div className={s.container}>
        <div className={s.lead}>
          <div className={s.eyebrow}>Principles</div>
          <h2 className={s.h2}>Trust comes first.</h2>
        </div>
        <div className={s.principles}>
          {PRINCIPLES.map((p) => (
            <div key={p.title}>
              <div className={s.principleIcon}>{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <>
      <section className={s.closing}>
        <div className={s.container}>
          <div className={s.eyebrow}>Open source prototype</div>
          <h2 className={s.h2}>See how it’s built.</h2>
          <p className={s.body}>Next.js, the OpenAI Realtime API, and a live-updating family dashboard.</p>
          <div className={s.buttons}>
            <GitHubButton label="View on GitHub" primary />
          </div>
        </div>
      </section>
      <footer className={s.footer}>
        <div className={`${s.container} ${s.footerInner}`}>
          <span>Elder Help · a project by Devansh</span>
          <span>Bookings and alerts in this prototype are simulated.</span>
        </div>
      </footer>
    </>
  );
}
