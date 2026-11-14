import { describe, expect, it } from 'vitest';
import { SessionStatus } from '@darnozom/shared-types';
import { isJoinable } from './join-window';

const session = (status = SessionStatus.SCHEDULED) => ({
  status,
  startsAt: '2026-10-12T14:00:00Z',
  endsAt: '2026-10-12T15:00:00Z',
});

describe('isJoinable', () => {
  it('opens 15 minutes before the start and closes 15 minutes after the end', () => {
    expect(isJoinable(session(), new Date('2026-10-12T13:44:00Z'))).toBe(false);
    expect(isJoinable(session(), new Date('2026-10-12T13:45:00Z'))).toBe(true);
    expect(isJoinable(session(), new Date('2026-10-12T15:15:00Z'))).toBe(true);
    expect(isJoinable(session(), new Date('2026-10-12T15:16:00Z'))).toBe(false);
  });
  it('is never joinable once cancelled or completed', () => {
    expect(isJoinable(session(SessionStatus.CANCELLED), new Date('2026-10-12T14:30:00Z'))).toBe(false);
    expect(isJoinable(session(SessionStatus.COMPLETED), new Date('2026-10-12T14:30:00Z'))).toBe(false);
  });
});
