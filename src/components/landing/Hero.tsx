import Image from 'next/image';
import heroElder from '../../../public/landing/hero-elder.png';
import alertCard from '../../../public/landing/alert-card.png';
import { GitHubButton } from './Nav';
import s from './landing.module.css';

export function Hero() {
  return (
    <section id="top" className={s.hero}>
      <div className={`${s.container} ${s.heroInner}`}>
        <div className={s.tag}>
          <span className={s.tagDot} aria-hidden="true" />
          Working prototype · voice AI
        </div>
        <h1 className={s.h1}>
          Help for your parents,
          <br />
          <span className={s.h1Soft}>one conversation away.</span>
        </h1>
        <p className={s.heroText}>
          Maya is a voice helper older adults just talk to. She books appointments, keeps track of medicine, and lets the
          family know when something needs a person.
        </p>
        <div className={s.buttons}>
          <a href="#how" className={`${s.btn} ${s.btnPrimary}`}>
            See how it works
          </a>
          <GitHubButton label="View the code on GitHub" />
        </div>

        <div className={s.frameWrap}>
          <div className={s.frame}>
            <div className={s.frameBar} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <Image
              src={heroElder}
              alt="The elder screen: Maya's portrait glowing while she speaks, a medicine reminder banner, and live captions"
              className={s.frameImg}
              priority
              sizes="(max-width: 960px) 100vw, 920px"
            />
          </div>
          <div className={s.floatCard}>
            <div className={s.floatLabel}>Family dashboard · just now</div>
            <Image src={alertCard} alt="A red alert card on the family dashboard: My sink is leaking, needs attention" sizes="300px" />
          </div>
        </div>
      </div>
    </section>
  );
}
