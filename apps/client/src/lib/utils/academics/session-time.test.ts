import { describe, expect, it } from 'vitest';
import { dayKey, formatClock, formatSessionTime } from './session-time';

describe('session-time', () => {
  it('formats a UTC instant in the requested time zone', () => {
    expect(formatSessionTime('2026-10-12T14:00:00.000Z', 'en', 'UTC')).toMatch(/Oct 12, 2026.*2:00/);
    expect(formatSessionTime('2026-10-12T14:00:00.000Z', 'en', 'Asia/Riyadh')).toMatch(/Oct 12, 2026.*5:00/);
  });

  it('formats only the clock time', () => {
    expect(formatClock('2026-10-12T14:00:00.000Z', 'en', 'UTC')).toMatch(/^2:00/);
  });

  it('groups by the viewer-local calendar day', () => {
    expect(dayKey(new Date(2026, 9, 14, 23, 30).toISOString())).toBe('2026-10-14');
    expect(dayKey(new Date(2026, 9, 14, 0, 5).toISOString())).toBe('2026-10-14');
  });
});
