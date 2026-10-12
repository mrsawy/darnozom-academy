import { describe, expect, it } from 'vitest';
import { unwrap } from './unwrap';

describe('unwrap', () => {
  it('returns successful results unchanged', () => {
    expect(unwrap({ _id: '1' })).toEqual({ _id: '1' });
    expect(unwrap([1, 2])).toEqual([1, 2]);
  });
  it('throws the server message for NATS errors', () => {
    expect(() => unwrap({ err: { message: 'groupFull' } })).toThrow('groupFull');
  });
});
