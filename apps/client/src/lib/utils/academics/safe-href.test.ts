import { describe, expect, it } from 'vitest';
import { safeHref } from './safe-href';

describe('safeHref', () => {
  it('keeps absolute http(s) links', () => {
    expect(safeHref('https://meet.example.com/abc')).toBe('https://meet.example.com/abc');
    expect(safeHref('HTTP://chat.whatsapp.com/x')).toBe('HTTP://chat.whatsapp.com/x');
  });
  it('drops scriptable, non-web, relative and empty links', () => {
    for (const url of [
      'javascript:alert(1)',
      ' javascript:alert(1)',
      'data:text/html,x',
      'ftp://x.com',
      'meet.example.com',
      '',
      null,
      undefined,
    ]) {
      expect({ url, href: safeHref(url) }).toEqual({ url, href: undefined });
    }
  });
});
