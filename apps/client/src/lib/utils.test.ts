import { describe, it, expect } from 'vitest';
import { cn, parseDurationToSeconds } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'block')).toBe('base block');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('parseDurationToSeconds', () => {
  it('parses hours', () => {
    expect(parseDurationToSeconds('5h')).toBe(18_000);
    expect(parseDurationToSeconds('1h')).toBe(3600);
  });

  it('parses minutes', () => {
    expect(parseDurationToSeconds('30m')).toBe(1800);
    expect(parseDurationToSeconds('5m')).toBe(300);
  });

  it('parses seconds', () => {
    expect(parseDurationToSeconds('45s')).toBe(45);
    expect(parseDurationToSeconds('1s')).toBe(1);
  });

  it('parses days', () => {
    expect(parseDurationToSeconds('2d')).toBe(172_800);
  });

  it('defaults to seconds when no unit', () => {
    expect(parseDurationToSeconds('60')).toBe(60);
  });

  it('throws on empty string', () => {
    expect(() => parseDurationToSeconds('')).toThrow('Duration must be a non-empty string');
  });

  it('throws on invalid format', () => {
    expect(() => parseDurationToSeconds('invalid')).toThrow('Invalid duration format');
  });

  it('throws on unknown unit', () => {
    expect(() => parseDurationToSeconds('5x')).toThrow('Unknown time unit');
  });
});
