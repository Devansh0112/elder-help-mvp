import { describe, expect, it, vi } from 'vitest';
import { singleFlight } from '@/components/elder/singleFlight';

describe('singleFlight', () => {
  it('concurrent calls share one run', async () => {
    let finish: (v: string) => void = () => {};
    const fn = vi.fn(() => new Promise<string>((r) => (finish = r)));
    const run = singleFlight(fn);
    const a = run();
    const b = run();
    expect(run.pending()).toBe(true);
    finish('session');
    expect(await a).toBe('session');
    expect(await b).toBe('session');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(run.pending()).toBe(false);
  });

  it('runs again after the first finishes or fails', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('ok');
    const run = singleFlight(fn);
    await expect(run()).rejects.toThrow('down');
    expect(await run()).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
