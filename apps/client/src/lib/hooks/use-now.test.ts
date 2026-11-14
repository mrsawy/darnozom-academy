import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNow } from './use-now';

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-12T13:40:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns the current time and moves it forward on every interval', () => {
    const { result } = renderHook(() => useNow(30_000));
    expect(result.current.toISOString()).toBe('2026-10-12T13:40:00.000Z');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.toISOString()).toBe('2026-10-12T13:40:30.000Z');
  });

  it('stops ticking after unmount', () => {
    const { unmount } = renderHook(() => useNow(30_000));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
