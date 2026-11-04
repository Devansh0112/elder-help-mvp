'use client';

import { useEffect, useState } from 'react';
import type { DashboardData } from '@/server/dashboard';

const POLL_MS = 5_000;

// Fetch on mount, refetch on every server change event; if the stream drops, poll every 5 seconds.
export function useLiveDashboard(): DashboardData | null {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const res = await fetch('/api/dashboard', { cache: 'no-store' });
        if (res.ok && !cancelled) setData((await res.json()) as DashboardData);
      } catch {
        // keep the last good data on screen
      }
    };

    void load();
    const events = new EventSource('/api/events');
    events.onmessage = () => void load();
    events.onerror = () => {
      events.close();
      poll ??= setInterval(load, POLL_MS);
    };

    return () => {
      cancelled = true;
      events.close();
      if (poll) clearInterval(poll);
    };
  }, []);

  return data;
}
