'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptLine } from '@/server/conversations';
import styles from './elder.module.css';

export function Captions({ lines, elderName }: { lines: TranscriptLine[]; elderName: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [lines.length]);

  return (
    <div className={styles.captions} data-testid="captions" aria-live="polite">
      {lines.map((l, i) => (
        <p key={i} className={l.role === 'maya' ? styles.maya : styles.elder}>
          <strong>{l.role === 'maya' ? 'Maya' : elderName}:</strong> {l.text}
        </p>
      ))}
      <div ref={end} />
    </div>
  );
}
