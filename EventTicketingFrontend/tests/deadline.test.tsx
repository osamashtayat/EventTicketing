import { renderHook, act } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { useBeforeDeadline } from '../src/lib/use-deadline';
it('wakes at the cutoff without continuing a render/timer loop', () => {
  vi.useFakeTimers();
  const start = Date.parse('2030-01-01T00:00:00Z');
  vi.setSystemTime(start);
  const { result, unmount } = renderHook(() => useBeforeDeadline('2030-01-01T00:00:01Z'));
  expect(result.current).toBe(true);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
  unmount();
  vi.useRealTimers();
});
