import { ArrowIcon, CheckIcon } from './Icons';
import s from './landing.module.css';

const STAGES = [
  {
    chip: 'Built',
    chipClass: s.chipDone,
    node: s.nodeDone,
    nodeContent: <CheckIcon />,
    list: s.listDone,
    title: 'The working prototype',
    items: ['Voice conversations with Maya', 'Appointments and medicine log', 'Family alerts and live dashboard', 'Conversation summaries'],
  },
  {
    chip: 'Building now',
    chipClass: s.chipNow,
    node: s.nodeNow,
    nodeContent: null,
    list: s.listNow,
    title: 'Out in the open',
    items: ['A live public demo you can try', 'Real SMS and email alerts'],
    progress: true,
  },
  {
    chip: 'Next',
    chipClass: s.chipNext,
    node: s.nodeNext,
    nodeContent: <ArrowIcon />,
    list: '',
    title: 'From helper to companion',
    items: ['Check-ins in a family member’s voice', 'A video avatar for Maya', 'Virtual friend groups'],
  },
];

export function Roadmap() {
  return (
    <section id="roadmap" className={`${s.section} ${s.glassSection}`}>
      <div className={`${s.blob} ${s.blobLilac}`} aria-hidden="true" />
      <div className={`${s.blob} ${s.blobMint}`} aria-hidden="true" />
      <div className={`${s.container} ${s.glassInner}`}>
        <div className={s.lead}>
          <div className={s.eyebrow}>What we’re up to</div>
          <h2 className={s.h2}>Built, building, and next.</h2>
        </div>
        <div className={s.road} role="list">
          <div className={s.track} aria-hidden="true" />
          {STAGES.map((st) => (
            <div key={st.chip} className={s.stage} role="listitem">
              <div className={`${s.node} ${st.node}`} aria-hidden="true">
                {st.nodeContent}
              </div>
              <div className={s.glass}>
                <span className={`${s.chip} ${st.chipClass}`}>{st.chip}</span>
                <h3>{st.title}</h3>
                <ul className={`${s.stageList} ${st.list}`}>
                  {st.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {st.progress && (
                  <div className={s.progress} aria-hidden="true">
                    <span />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
