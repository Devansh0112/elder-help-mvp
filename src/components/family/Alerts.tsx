import type { DashboardData } from '@/server/dashboard';
import styles from './family.module.css';
import { formatTime } from './format';

export function Alerts({ items }: { items: DashboardData['alerts'] }) {
  return (
    <section className={styles.section} data-testid="alerts">
      <h2>Alerts</h2>
      {items.length === 0 && <p className={styles.empty}>No alerts.</p>}
      <ul>
        {items.map((a) => (
          <li key={a.id} className={a.status === 'open' ? styles.alert : styles.card} data-testid="alert-card" data-status={a.status}>
            <strong>{a.issue}</strong>
            <div className={styles.meta}>
              {formatTime(a.createdAt)} · {a.status === 'open' ? 'Needs attention' : 'Resolved'}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
