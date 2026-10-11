import { escapeRegex } from './escape-regex';

describe('escapeRegex', () => {
  it('escapes every metacharacter so the text matches literally', () => {
    const raw = 'a.*+?^${}()|[]\\b';
    expect(new RegExp(escapeRegex(raw)).test(raw)).toBe(true);
    expect(new RegExp(escapeRegex('a.c')).test('abc')).toBe(false);
  });
  it('never throws on an unbalanced parenthesis', () => {
    expect(() => new RegExp(escapeRegex('('))).not.toThrow();
  });
});
