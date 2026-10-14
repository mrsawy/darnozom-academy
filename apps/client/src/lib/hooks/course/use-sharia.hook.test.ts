import { describe, expect, it } from 'vitest';
import { shariaKeys } from './use-sharia.hook';

describe('shariaKeys', () => {
  it('namespaces every key under sharia, so one review refreshes the queue and the history', () => {
    expect(shariaKeys.queue[0]).toBe('sharia');
    expect(shariaKeys.versions('c1')[0]).toBe('sharia');
  });

  it('keys the history by content', () => {
    expect(shariaKeys.versions('c1')).not.toEqual(shariaKeys.versions('c2'));
  });
});
