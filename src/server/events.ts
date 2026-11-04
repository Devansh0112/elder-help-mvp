export type ChangeKind = 'appointments' | 'medicine' | 'alerts' | 'conversations';

type Listener = (kind: ChangeKind) => void;

// Kept on globalThis so Next.js dev reloads (and every route bundle) share one bus.
const g = globalThis as unknown as { __elderHelpListeners?: Set<Listener> };
const listeners = (g.__elderHelpListeners ??= new Set<Listener>());

export function onChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitChange(kind: ChangeKind): void {
  for (const fn of listeners) {
    try {
      fn(kind);
    } catch {
      // One broken subscriber must not stop the others.
    }
  }
}
