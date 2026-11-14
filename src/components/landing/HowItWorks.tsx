import Image, { type StaticImageData } from 'next/image';
import stepTalk from '../../../public/landing/step-talk.png';
import stepReminder from '../../../public/landing/step-reminder.png';
import stepFamily from '../../../public/landing/step-family.png';
import s from './landing.module.css';

const STEPS: { img: StaticImageData; alt: string; title: string; text: string }[] = [
  {
    img: stepTalk,
    alt: 'Captions: Margaret asks to see her doctor next week, and Maya confirms the appointment is booked',
    title: 'Just talk',
    text: '“I need to see my doctor next week.” Maya books it and confirms out loud.',
  },
  {
    img: stepReminder,
    alt: 'A yellow banner reading Time for your Metformin above Maya’s portrait',
    title: 'Gentle reminders',
    text: 'Maya reminds her about Metformin. “I took it.” The dose is logged.',
  },
  {
    img: stepFamily,
    alt: 'The family dashboard: Metformin marked taken and a red alert saying My sink is leaking',
    title: 'Family in the loop',
    text: '“My sink is leaking.” That’s beyond Maya, so the family gets an alert right away.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className={s.section}>
      <div className={s.container}>
        <div className={s.lead}>
          <div className={s.eyebrow}>How it works</div>
          <h2 className={s.h2}>One button for them. A clear picture for you.</h2>
          <p>No menus, no typing, no learning curve. Margaret talks, Maya acts, and Priya sees it all on her phone.</p>
        </div>
        <ol className={s.steps} style={{ listStyle: 'none' }}>
          {STEPS.map((step, i) => (
            <li key={step.title} className={s.step}>
              <div className={s.shot}>
                <Image src={step.img} alt={step.alt} sizes="(max-width: 900px) 90vw, 340px" />
              </div>
              <div className={s.stepNum}>0{i + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
