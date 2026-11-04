import type { DashboardData } from '@/server/dashboard';
import styles from './family.module.css';

export function Medicines({ items }: { items: DashboardData['medicines'] }) {
  return (
    <section className={styles.section} data-testid="medicines">
      <h2>Today&apos;s medicines</h2>
      <ul>
        {items.map((m) => (
          <li
            key={m.scheduleId}
            className={`${styles.card} ${styles.medicine}`}
            data-testid="medicine-item"
            data-taken={m.takenToday ? 'true' : 'false'}
          >
            <span className={m.takenToday ? styles.check : styles.box} aria-hidden="true">
              {m.takenToday ? '✓' : ''}
            </span>
            <span>
              <strong>{m.name}</strong> {m.dose} at {m.timeOfDay}
            </span>
            <span className={m.takenToday ? styles.taken : styles.notTaken}>{m.takenToday ? 'Taken' : 'Not yet'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
