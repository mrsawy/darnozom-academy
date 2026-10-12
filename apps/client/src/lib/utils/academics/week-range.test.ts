import { describe, expect, it } from 'vitest';
import { addWeeks, weekRange } from './week-range';

describe('weekRange', () => {
  it('runs from local Sunday 00:00 to the next Sunday 00:00', () => {
    const { from, to } = weekRange(new Date(2026, 9, 14, 15, 30)); // Wednesday
    expect([from.getFullYear(), from.getMonth(), from.getDate(), from.getDay(), from.getHours()]).toEqual([2026, 9, 11, 0, 0]);
    expect([to.getFullYear(), to.getMonth(), to.getDate(), to.getDay(), to.getHours()]).toEqual([2026, 9, 18, 0, 0]);
  });

  it('keeps a Sunday in its own week and a Saturday at the end of it', () => {
    expect(weekRange(new Date(2026, 9, 11, 9)).from.getDate()).toBe(11);
    expect(weekRange(new Date(2026, 9, 17, 23, 59)).from.getDate()).toBe(11);
  });

  it('moves by whole weeks', () => {
    const next = addWeeks(new Date(2026, 9, 14, 15), 1);
    expect([next.getMonth(), next.getDate()]).toEqual([9, 21]);
    expect(addWeeks(new Date(2026, 9, 14), -2).getDate()).toBe(30); // 14 October minus 14 days = 30 September
  });
});
