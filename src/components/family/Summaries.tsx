import type { DashboardData } from '@/server/dashboard';
import styles from './family.module.css';
import { formatTime } from './format';

export function Summaries({ items }: { items: DashboardData['summaries'] }) {
  return (
    <section className={styles.section} data-testid="summaries">
      <h2>Latest conversations</h2>
      {items.length === 0 && <p className={styles.empty}>No conversations yet.</p>}
      <ul>
        {items.map((s) => (
          <li key={s.id} className={styles.card} data-testid="summary-item">
            <div className={styles.meta}>
              {formatTime(s.startedAt)}
              {s.endedAt === null && <span className={styles.badge}>In progress</span>}
            </div>
            {s.summary && <p className={styles.summary}>{s.summary}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
