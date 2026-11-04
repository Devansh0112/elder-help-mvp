'use client';

import { Alerts } from '@/components/family/Alerts';
import { Appointments } from '@/components/family/Appointments';
import { Medicines } from '@/components/family/Medicines';
import { Summaries } from '@/components/family/Summaries';
import styles from '@/components/family/family.module.css';
import { useLiveDashboard } from '@/components/family/useLiveDashboard';
import { household } from '@/config/household';

export default function FamilyPage() {
  const data = useLiveDashboard();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{household.elderName} today</h1>
        <p>
          Hi {household.familyName}. This page updates on its own when {household.helperName} does something.
        </p>
      </header>
      {data === null ? (
        <p className={styles.empty}>Loading…</p>
      ) : (
        <div className={styles.grid}>
          <Summaries items={data.summaries} />
          <Appointments items={data.appointments} />
          <Medicines items={data.medicines} />
          <Alerts items={data.alerts} />
        </div>
      )}
    </main>
  );
}
