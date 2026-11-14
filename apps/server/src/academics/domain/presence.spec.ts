import { AcademicsErrors, AttendanceStatus, SessionStatus } from '@darnozom/shared-types';
import { checkJoinWindow, statusFromJoin, totalSeconds } from './presence';

const START = new Date('2026-10-12T14:00:00Z');
const END = new Date('2026-10-12T15:00:00Z');
const at = (iso: string) => new Date(iso);
const session = (status = SessionStatus.SCHEDULED) => ({ status, startsAt: START, endsAt: END });

describe('statusFromJoin', () => {
  it('is PRESENT before the start', () => {
    expect(statusFromJoin(START, at('2026-10-12T13:55:00Z'))).toBe(AttendanceStatus.PRESENT);
  });
  it('is PRESENT exactly 10 minutes after the start', () => {
    expect(statusFromJoin(START, at('2026-10-12T14:10:00Z'))).toBe(AttendanceStatus.PRESENT);
  });
  it('is LATE 11 minutes after the start', () => {
    expect(statusFromJoin(START, at('2026-10-12T14:11:00Z'))).toBe(AttendanceStatus.LATE);
  });
});

describe('checkJoinWindow', () => {
  it('rejects a cancelled session', () => {
    expect(checkJoinWindow(session(SessionStatus.CANCELLED), at('2026-10-12T14:30:00Z'))).toBe(AcademicsErrors.JOIN_WINDOW_CLOSED);
  });
  it('rejects 16 minutes before the start', () => {
    expect(checkJoinWindow(session(), at('2026-10-12T13:44:00Z'))).toBe(AcademicsErrors.JOIN_WINDOW_CLOSED);
  });
  it('rejects 16 minutes after the end', () => {
    expect(checkJoinWindow(session(), at('2026-10-12T15:16:00Z'))).toBe(AcademicsErrors.JOIN_WINDOW_CLOSED);
  });
  it('accepts 15 minutes before the start and 15 minutes after the end', () => {
    expect(checkJoinWindow(session(), at('2026-10-12T13:45:00Z'))).toBeNull();
    expect(checkJoinWindow(session(), at('2026-10-12T15:15:00Z'))).toBeNull();
  });
});

describe('totalSeconds', () => {
  const cap = at('2026-10-12T15:15:00Z');
  it('counts a closed segment', () => {
    const segments = [{ joinedAt: at('2026-10-12T14:00:00Z'), leftAt: at('2026-10-12T14:30:00Z') }];
    expect(totalSeconds(segments, at('2026-10-12T14:30:00Z'), cap)).toBe(1800);
  });
  it('ends an open segment at the last heartbeat, not at the cap', () => {
    const segments = [{ joinedAt: at('2026-10-12T14:00:00Z') }];
    expect(totalSeconds(segments, at('2026-10-12T14:05:00Z'), cap)).toBe(300);
  });
  it('never counts past the cap', () => {
    const segments = [{ joinedAt: at('2026-10-12T15:00:00Z') }];
    expect(totalSeconds(segments, at('2026-10-12T16:00:00Z'), cap)).toBe(900);
  });
  it('sums several segments', () => {
    const segments = [
      { joinedAt: at('2026-10-12T14:00:00Z'), leftAt: at('2026-10-12T14:10:00Z') },
      { joinedAt: at('2026-10-12T14:20:00Z'), leftAt: at('2026-10-12T14:30:00Z') },
    ];
    expect(totalSeconds(segments, at('2026-10-12T14:30:00Z'), cap)).toBe(1200);
  });
});
