import type { DashboardData } from '@/server/dashboard';
import styles from './family.module.css';

export function Appointments({ items }: { items: DashboardData['appointments'] }) {
  return (
    <section className={styles.section} data-testid="appointments">
      <h2>Upcoming appointments</h2>
      {items.length === 0 && <p className={styles.empty}>Nothing booked.</p>}
      <ul>
        {items.map((a) => (
          <li key={a.id} className={styles.card} data-testid="appointment-item">
            <strong className={styles.capitalize}>{a.type}</strong>, {a.when}
            <div className={styles.meta}>Confirmation {a.confirmationCode}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
