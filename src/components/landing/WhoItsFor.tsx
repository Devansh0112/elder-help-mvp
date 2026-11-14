import { AlertIcon, CalendarIcon, ChatIcon, CheckIcon, DashboardIcon, MicIcon } from './Icons';
import s from './landing.module.css';

const WARM = '#d9764c';
const BLUE = '#2450d8';
const RED = '#c0392b';

const PEOPLE = [
  {
    initial: 'M',
    avatar: s.avatarWarm,
    title: 'Older adults',
    who: 'Like Margaret, 78, who lives alone',
    quote: '“I just talk to her, and she sorts it out.”',
    features: [
      { icon: <MicIcon color={WARM} />, title: 'One button, a warm voice', text: 'No menus, no typing, big clear text' },
      { icon: <CalendarIcon color={WARM} />, title: 'Appointments and medicine', text: 'Handled just by asking' },
      { icon: <CheckIcon color={WARM} />, title: 'Always told what happened', text: 'Maya confirms every action out loud' },
    ],
  },
  {
    initial: 'P',
    avatar: s.avatarBlue,
    title: 'Families',
    who: 'Like Priya, her daughter, two hours away',
    quote: '“I can see Mum’s day without calling five times.”',
    features: [
      { icon: <DashboardIcon color={BLUE} />, title: 'A live dashboard', text: 'Updates on its own, no refreshing' },
      { icon: <ChatIcon color={BLUE} />, title: 'Short conversation summaries', text: 'Two or three lines, not transcripts' },
      { icon: <AlertIcon color={RED} />, title: 'Alerts when it matters', text: 'A red card the moment Maya needs a person' },
    ],
  },
];

export function WhoItsFor() {
  return (
    <section id="who" className={`${s.section} ${s.glassSection}`}>
      <div className={`${s.blob} ${s.blobBlue}`} aria-hidden="true" />
      <div className={`${s.blob} ${s.blobPeach}`} aria-hidden="true" />
      <div className={`${s.container} ${s.glassInner}`}>
        <div className={s.lead}>
          <div className={s.eyebrow}>Who it’s for</div>
          <h2 className={s.h2}>Built for two people at once.</h2>
        </div>
        <div className={s.personas}>
          {PEOPLE.map((p) => (
            <article key={p.title} className={s.glass}>
              <div className={s.persona}>
                <div className={`${s.avatar} ${p.avatar}`} aria-hidden="true">
                  {p.initial}
                </div>
                <div>
                  <h3>{p.title}</h3>
                  <span>{p.who}</span>
                </div>
              </div>
              <p className={s.quote}>{p.quote}</p>
              <ul className={s.features}>
                {p.features.map((f) => (
                  <li key={f.title} className={s.feature}>
                    <div className={s.icon}>{f.icon}</div>
                    <div>
                      <b>{f.title}</b>
                      <small>{f.text}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
