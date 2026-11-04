import styles from './elder.module.css';

export function ReminderBanner({ name, dose }: { name: string; dose: string }) {
  return (
    <div className={styles.banner} data-testid="reminder-banner" role="status">
      Time for your {name} ({dose})
    </div>
  );
}
