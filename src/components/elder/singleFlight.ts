// Wraps an async function so overlapping calls share the run already in flight (the first caller's args win).
export function singleFlight<A extends unknown[], T>(
  fn: (...args: A) => Promise<T>,
): { (...args: A): Promise<T>; pending(): boolean } {
  let inFlight: Promise<T> | null = null;
  const run = (...args: A) => {
    inFlight ??= fn(...args).finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
  run.pending = () => inFlight !== null;
  return run;
}
