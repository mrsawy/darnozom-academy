import { Types } from 'mongoose';
import { SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { SessionScheduleService } from './session-schedule.service';

const ORG = new Types.ObjectId('64b0000000000000000000bb');
const groupId = new Types.ObjectId('64b000000000000000000011');
const teacherId = new Types.ObjectId('64b0000000000000000000a1');
const now = new Date('2026-11-10T12:00:00.000Z'); // a Tuesday

const group = (over: Record<string, unknown> = {}) => ({ _id: groupId, organizationId: ORG, teacherId, totalSessions: 6, ...over });
const session = (sequence: number, startsAt: string, over: Record<string, unknown> = {}) => ({
  _id: new Types.ObjectId(),
  sequence,
  status: SessionStatus.SCHEDULED,
  startsAt: new Date(startsAt),
  attendance: [] as unknown[],
  report: null,
  ...over,
});

function setup(existing: ReturnType<typeof session>[]) {
  const dbSession = { withTransaction: jest.fn(async (fn: () => Promise<void>) => fn()), endSession: jest.fn() };
  const connection = { startSession: jest.fn().mockResolvedValue(dbSession) };
  const sessionModel = {
    find: jest.fn().mockReturnValue(mockQuery(existing)),
    deleteMany: jest.fn().mockReturnValue(mockQuery({ deletedCount: 0 })),
    insertMany: jest.fn().mockResolvedValue([]),
  };
  const service = new SessionScheduleService(sessionModel as never, connection as never);
  return { service, sessionModel, dbSession };
}

// Mondays 10:00 UTC: 10-26, 11-02, 11-09 already completed; 11-16, 11-23, 11-30 still upcoming.
const history = () => [
  session(1, '2026-10-26T10:00:00Z', { status: SessionStatus.COMPLETED }),
  session(2, '2026-11-02T10:00:00Z', { status: SessionStatus.COMPLETED }),
  session(3, '2026-11-09T10:00:00Z', { status: SessionStatus.COMPLETED }),
];
const upcoming = () => [session(4, '2026-11-16T10:00:00Z'), session(5, '2026-11-23T10:00:00Z'), session(6, '2026-11-30T10:00:00Z')];
const wednesdays = [{ dayOfWeek: 3, startTime: '09:00', durationMinutes: 60 }];

describe('SessionScheduleService.regenerateUpcoming', () => {
  it('replaces untouched upcoming sessions with the new weekly slots and keeps the history', async () => {
    const existing = [...history(), ...upcoming()];
    const { service, sessionModel, dbSession } = setup(existing);
    const result = await service.regenerateUpcoming(group(), { schedule: wednesdays, timezone: 'UTC' }, now);

    expect(result).toEqual({ removed: 3, created: 3 });
    const [deleteFilter, deleteOptions] = sessionModel.deleteMany.mock.calls[0];
    expect(deleteFilter._id.$in.map(String).sort()).toEqual(
      existing
        .slice(3)
        .map((s) => String(s._id))
        .sort()
    );
    expect(deleteOptions).toEqual({ session: dbSession });

    const [docs] = sessionModel.insertMany.mock.calls[0];
    // Wednesdays 09:00 UTC after "now", continuing the sequence after the 3 kept sessions.
    expect(docs.map((d: { sequence: number }) => d.sequence)).toEqual([4, 5, 6]);
    expect(docs.map((d: { startsAt: Date }) => d.startsAt.toISOString())).toEqual([
      '2026-11-11T09:00:00.000Z',
      '2026-11-18T09:00:00.000Z',
      '2026-11-25T09:00:00.000Z',
    ]);
    expect(docs[0]).toMatchObject({
      organizationId: ORG,
      groupId,
      teacherId,
      status: SessionStatus.SCHEDULED,
      endsAt: new Date('2026-11-11T10:00:00.000Z'),
    });
  });

  it('never touches sessions that have attendance, or are not SCHEDULED', async () => {
    const existing = [
      ...history(),
      session(4, '2026-11-16T10:00:00Z', { attendance: [{ studentId: new Types.ObjectId() }] }),
      session(5, '2026-11-23T10:00:00Z', { status: SessionStatus.CANCELLED }),
      session(6, '2026-11-30T10:00:00Z'),
    ];
    const { service, sessionModel } = setup(existing);
    const result = await service.regenerateUpcoming(group({ totalSessions: 7 }), { schedule: wednesdays, timezone: 'UTC' }, now);

    // Only #6 is replaceable. Kept and counted: 3 completed + #4 (has attendance) = 4; cancelled #5 does not count.
    expect(result.removed).toBe(1);
    const [deleteFilter] = sessionModel.deleteMany.mock.calls[0];
    expect(deleteFilter._id.$in.map(String)).toEqual([String(existing[5]._id)]);
    const [docs] = sessionModel.insertMany.mock.calls[0];
    expect(docs).toHaveLength(3); // 7 total - 4 counted
    expect(docs[0].sequence).toBe(6); // continues after the highest kept sequence (#5)
  });

  it('does not recreate a slot that already passed earlier today', async () => {
    const { service, sessionModel } = setup([...history(), ...upcoming()]);
    // Tuesday 08:00 UTC is behind "now" (12:00 UTC Tuesday), so the first new session is next Tuesday.
    await service.regenerateUpcoming(group(), { schedule: [{ dayOfWeek: 2, startTime: '08:00', durationMinutes: 60 }], timezone: 'UTC' }, now);
    const [docs] = sessionModel.insertMany.mock.calls[0];
    expect(docs[0].startsAt.toISOString()).toBe('2026-11-17T08:00:00.000Z');
  });

  it('only removes when nothing remains to be scheduled', async () => {
    const { service, sessionModel } = setup([...history(), ...upcoming()]);
    const result = await service.regenerateUpcoming(group({ totalSessions: 3 }), { schedule: wednesdays, timezone: 'UTC' }, now);
    expect(result).toEqual({ removed: 3, created: 0 });
    expect(sessionModel.insertMany).not.toHaveBeenCalled();
  });

  it('does nothing for a group without a teacher or a total', async () => {
    const { service, sessionModel } = setup(upcoming());
    expect(await service.regenerateUpcoming(group({ teacherId: null }), { schedule: [], timezone: 'UTC' }, now)).toEqual({ removed: 0, created: 0 });
    expect(await service.regenerateUpcoming(group({ totalSessions: null }), { schedule: [], timezone: 'UTC' }, now)).toEqual({ removed: 0, created: 0 });
    expect(sessionModel.find).not.toHaveBeenCalled();
  });
});
