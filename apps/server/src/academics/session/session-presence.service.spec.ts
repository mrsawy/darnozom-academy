import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, AttendanceSource, AttendanceStatus, MeetingProvider, PresenceRole, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionPresenceService } from './session-presence.service';

const ORG = '64b0000000000000000000bb';
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const TEACHER = id(1);
const A = id(2);
const WITHDRAWN = id(4);
const SESSION = id(11);
const GROUP = id(10);
const START = new Date('2026-10-12T14:00:00Z');
const END = new Date('2026-10-12T15:00:00Z');
const onTime = new Date('2026-10-12T14:03:00Z');
const late = new Date('2026-10-12T14:20:00Z');

const actorOf = (roleName: Roles, _id: string): AcademicsActor => ({ _id, organizationId: ORG, roleName, additionalRoles: [] });
const teacher = actorOf(Roles.INSTRUCTOR, String(TEACHER));
const studentA = actorOf(Roles.STUDENT, String(A));

const sessionDoc = (over: Record<string, unknown> = {}) => ({
  _id: SESSION,
  groupId: GROUP,
  teacherId: TEACHER,
  startsAt: START,
  endsAt: END,
  status: SessionStatus.SCHEDULED,
  teacherAttendance: null,
  attendance: [],
  ...over,
});

function setup(opts: { session?: ReturnType<typeof sessionDoc>; presence?: unknown; group?: unknown } = {}) {
  const sessionModel = { updateOne: jest.fn().mockImplementation(() => mockQuery({ matchedCount: 1, modifiedCount: 1 })) };
  const presenceModel = {
    findOne: jest.fn().mockReturnValue(mockQuery(opts.presence ?? null)),
    find: jest.fn().mockReturnValue(mockQuery([])),
    updateOne: jest.fn().mockImplementation(() => mockQuery({ matchedCount: 1, modifiedCount: 1 })),
  };
  const groupModel = {
    findOne: jest.fn().mockReturnValue(mockQuery(opts.group ?? { meetingLink: 'https://meet.example/x', meetingProvider: MeetingProvider.EXTERNAL_URL })),
  };
  const state = {
    loadInOrg: jest.fn().mockResolvedValue(opts.session ?? sessionDoc()),
    activeStudentIds: jest.fn().mockResolvedValue([String(A)]), // WITHDRAWN is not listed
  };
  const agora = { issueGroupSessionToken: jest.fn().mockReturnValue({ appId: 'app', channelName: `grp_${SESSION}`, uid: 7, token: 'tok', expiresAt: 123 }) };
  const service = new SessionPresenceService(sessionModel as never, presenceModel as never, groupModel as never, state as never, agora as never);
  return { service, sessionModel, presenceModel, groupModel, state, agora };
}

describe('SessionPresenceService.join', () => {
  it('records presence and an AUTO PRESENT row for a student who joins on time', async () => {
    const { service, sessionModel, presenceModel } = setup();
    const result = await service.join(studentA, String(SESSION), onTime);

    const [filter, update, options] = presenceModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ sessionId: SESSION, userId: A });
    expect(update.$setOnInsert).toMatchObject({ organizationId: new Types.ObjectId(ORG), groupId: GROUP, role: PresenceRole.STUDENT, firstJoinedAt: onTime });
    expect(update.$set).toEqual({ lastSeenAt: onTime });
    expect(update.$push).toEqual({ segments: { joinedAt: onTime } });
    expect(options).toEqual({ upsert: true });

    const [sFilter, sUpdate] = sessionModel.updateOne.mock.calls[0];
    expect(sFilter).toEqual({
      _id: SESSION,
      status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] },
      'attendance.studentId': { $ne: A },
    });
    expect(sUpdate.$push.attendance).toEqual({ studentId: A, status: AttendanceStatus.PRESENT, markedBy: A, markedAt: onTime, source: AttendanceSource.AUTO });
    expect(result).toEqual({ provider: MeetingProvider.EXTERNAL_URL, meetingLink: 'https://meet.example/x' });
  });

  it('marks a student LATE when joining more than 10 minutes after the start', async () => {
    const { service, sessionModel } = setup();
    await service.join(studentA, String(SESSION), late);
    expect(sessionModel.updateOne.mock.calls[0][1].$push.attendance.status).toBe(AttendanceStatus.LATE);
  });

  it('sets the teacher attendance only when it is still empty', async () => {
    const { service, sessionModel } = setup();
    await service.join(teacher, String(SESSION), late);
    const [filter, update] = sessionModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SESSION, status: { $in: [SessionStatus.SCHEDULED, SessionStatus.REPORT_PENDING] }, teacherAttendance: null });
    expect(update).toEqual({ $set: { teacherAttendance: AttendanceStatus.LATE } });
  });

  it('a second join keeps the first join time, never turns PRESENT into LATE, and starts a segment only after the last one closed', async () => {
    const open = setup({ presence: { firstJoinedAt: onTime, lastSeenAt: onTime, segments: [{ joinedAt: onTime }] } });
    await open.service.join(studentA, String(SESSION), new Date('2026-10-12T14:05:00Z'));
    // Re-applied (idempotent: it only matches students without a row) from the FIRST join, so it stays PRESENT.
    expect(open.sessionModel.updateOne.mock.calls[0][1].$push.attendance.status).toBe(AttendanceStatus.PRESENT);
    const openUpdate = open.presenceModel.updateOne.mock.calls[0][1];
    expect(openUpdate.$push).toBeUndefined();
    expect(openUpdate.$set).toEqual({ lastSeenAt: new Date('2026-10-12T14:05:00Z') });
    expect(openUpdate.$setOnInsert).toBeUndefined();

    const closed = setup({ presence: { firstJoinedAt: onTime, lastSeenAt: onTime, segments: [{ joinedAt: onTime, leftAt: onTime }] } });
    await closed.service.join(studentA, String(SESSION), late);
    expect(closed.presenceModel.updateOne.mock.calls[0][1].$push).toEqual({ segments: { joinedAt: late } });
  });

  it('rejoining after a silent drop closes the old segment at the last heartbeat, so time away is not counted', async () => {
    const lastSeen = new Date('2026-10-12T14:05:00Z');
    const back = new Date('2026-10-12T14:50:00Z');
    const { service, presenceModel } = setup({ presence: { firstJoinedAt: onTime, lastSeenAt: lastSeen, segments: [{ joinedAt: onTime }] } });
    await service.join(studentA, String(SESSION), back);
    expect(presenceModel.updateOne).toHaveBeenNthCalledWith(
      1,
      { sessionId: SESSION, userId: A },
      { $set: { 'segments.$[open].leftAt': lastSeen } },
      { arrayFilters: [{ 'open.leftAt': null }] }
    );
    expect(presenceModel.updateOne).toHaveBeenNthCalledWith(2, { sessionId: SESSION, userId: A }, { $set: { lastSeenAt: back }, $push: { segments: { joinedAt: back } } });
  });

  it('a join within two heartbeats of the last one (token renewal) does not split the segment', async () => {
    const { service, presenceModel } = setup({ presence: { firstJoinedAt: onTime, lastSeenAt: new Date('2026-10-12T14:20:00Z'), segments: [{ joinedAt: onTime }] } });
    await service.join(studentA, String(SESSION), new Date('2026-10-12T14:21:00Z'));
    expect(presenceModel.updateOne).toHaveBeenCalledTimes(1);
    expect(presenceModel.updateOne.mock.calls[0][1].$push).toBeUndefined();
  });

  it('never overwrites an existing mark: the write only matches students without a row', async () => {
    const { service, sessionModel } = setup({ session: sessionDoc({ attendance: [{ studentId: A, status: AttendanceStatus.ABSENT }] }) });
    await service.join(studentA, String(SESSION), late);
    expect(sessionModel.updateOne.mock.calls[0][0]['attendance.studentId']).toEqual({ $ne: A });
  });

  it('rejects joins outside the window without writing anything', async () => {
    const { service, sessionModel, presenceModel } = setup();
    await expect(service.join(studentA, String(SESSION), new Date('2026-10-12T13:00:00Z'))).rejects.toThrow(new ConflictException(AcademicsErrors.JOIN_WINDOW_CLOSED));
    await expect(service.join(studentA, String(SESSION), new Date('2026-10-12T16:00:00Z'))).rejects.toThrow(ConflictException);
    const cancelled = setup({ session: sessionDoc({ status: SessionStatus.CANCELLED }) });
    await expect(cancelled.service.join(studentA, String(SESSION), onTime)).rejects.toThrow(ConflictException);
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
    expect(presenceModel.updateOne).not.toHaveBeenCalled();
    expect(cancelled.presenceModel.updateOne).not.toHaveBeenCalled();
  });

  it('rejects anyone who is not the session teacher or an active student of the group', async () => {
    const { service, sessionModel, presenceModel } = setup();
    for (const stranger of [actorOf(Roles.INSTRUCTOR, String(id(90))), actorOf(Roles.STUDENT, String(WITHDRAWN)), actorOf(Roles.STUDENT, String(id(91)))]) {
      await expect(service.join(stranger, String(SESSION), onTime)).rejects.toThrow(new ForbiddenException(AcademicsErrors.NOT_SESSION_PARTICIPANT));
    }
    expect(sessionModel.updateOne).not.toHaveBeenCalled();
    expect(presenceModel.updateOne).not.toHaveBeenCalled();
  });
});

describe('SessionPresenceService.join for Agora groups', () => {
  it('returns an Agora token for the session channel and no link, with the same attendance writes', async () => {
    const { service, sessionModel, agora } = setup({ group: { meetingProvider: MeetingProvider.AGORA, meetingLink: null } });
    const result = await service.join(studentA, String(SESSION), onTime);
    expect(agora.issueGroupSessionToken).toHaveBeenCalledWith(String(A), String(SESSION));
    expect(result).toEqual({ provider: MeetingProvider.AGORA, agora: { appId: 'app', channelName: `grp_${SESSION}`, uid: 7, token: 'tok', expiresAt: 123 } });
    expect(sessionModel.updateOne.mock.calls[0][1].$push.attendance.source).toBe(AttendanceSource.AUTO);
  });

  it('does not issue a token for external-link groups', async () => {
    const { service, agora } = setup();
    expect((await service.join(studentA, String(SESSION), onTime)).agora).toBeUndefined();
    expect(agora.issueGroupSessionToken).not.toHaveBeenCalled();
  });

  it('a repeat join (token renewal) returns a fresh token and keeps the first-join status', async () => {
    const { service, sessionModel, agora } = setup({
      group: { meetingProvider: MeetingProvider.AGORA },
      presence: { firstJoinedAt: onTime, lastSeenAt: onTime, segments: [{ joinedAt: onTime }] },
    });
    const result = await service.join(studentA, String(SESSION), new Date('2026-10-12T14:04:00Z'));
    expect(result.agora?.token).toBe('tok');
    expect(agora.issueGroupSessionToken).toHaveBeenCalledTimes(1);
    expect(sessionModel.updateOne.mock.calls[0][1].$push.attendance.status).toBe(AttendanceStatus.PRESENT);
  });
});

describe('SessionPresenceService.heartbeat and leave', () => {
  it('heartbeat refreshes lastSeenAt for the caller in their organization', async () => {
    const { service, presenceModel } = setup();
    await service.heartbeat(studentA, String(SESSION), onTime);
    expect(presenceModel.updateOne).toHaveBeenCalledWith(
      { sessionId: SESSION, userId: A, organizationId: new Types.ObjectId(ORG) },
      { $set: { lastSeenAt: onTime } }
    );
  });

  it('leave closes the open segment', async () => {
    const { service, presenceModel } = setup();
    await service.leave(studentA, String(SESSION), late);
    expect(presenceModel.updateOne).toHaveBeenCalledWith(
      { sessionId: SESSION, userId: A, organizationId: new Types.ObjectId(ORG) },
      { $set: { lastSeenAt: late, 'segments.$[open].leftAt': late } },
      { arrayFilters: [{ 'open.leftAt': null }] }
    );
  });
});

describe('SessionPresenceService.markNoShows', () => {
  const B = id(3);
  const now = new Date('2026-10-12T16:00:00Z');
  const FILTER = { _id: SESSION, status: SessionStatus.REPORT_PENDING, autoAbsentAppliedAt: null };

  function noShowSetup(presenceRows: { userId: Types.ObjectId; role: PresenceRole }[], marked: Types.ObjectId[] = [A]) {
    const ctx = setup();
    ctx.state.activeStudentIds.mockResolvedValue([String(A), String(B)]);
    (ctx.sessionModel as unknown as { find: jest.Mock }).find = jest
      .fn()
      .mockReturnValue(mockQuery([{ _id: SESSION, groupId: GROUP, attendance: marked.map((studentId) => ({ studentId, status: AttendanceStatus.PRESENT })) }]));
    ctx.presenceModel.find.mockReturnValue(mockQuery(presenceRows));
    return ctx;
  }

  it('marks active students with no row and no presence ABSENT (AUTO) once a student joined through the platform', async () => {
    const { service, sessionModel } = noShowSetup([{ userId: A, role: PresenceRole.STUDENT }]);
    expect(await service.markNoShows(now)).toBe(1);
    expect((sessionModel as unknown as { find: jest.Mock }).find).toHaveBeenCalledWith({ status: SessionStatus.REPORT_PENDING, endsAt: { $lte: now }, autoAbsentAppliedAt: null });
    expect(sessionModel.updateOne).toHaveBeenCalledWith(
      { ...FILTER, 'attendance.studentId': { $nin: [B] } },
      {
        $push: { attendance: { $each: [{ studentId: B, status: AttendanceStatus.ABSENT, markedBy: B, markedAt: now, source: AttendanceSource.AUTO }] } },
        $set: { autoAbsentAppliedAt: now },
      }
    );
  });

  it('never marks a student ABSENT who has a presence record, even if their attendance row is missing', async () => {
    const { service, sessionModel } = noShowSetup(
      [
        { userId: A, role: PresenceRole.STUDENT },
        { userId: B, role: PresenceRole.STUDENT },
      ],
      [A]
    );
    await service.markNoShows(now);
    expect(sessionModel.updateOne).toHaveBeenCalledWith(FILTER, { $set: { autoAbsentAppliedAt: now } });
  });

  it('marks nobody when only the teacher joined, but still flags the session as handled', async () => {
    const { service, sessionModel } = noShowSetup([{ userId: TEACHER, role: PresenceRole.TEACHER }]);
    await service.markNoShows(now);
    expect(sessionModel.updateOne).toHaveBeenCalledWith(FILTER, { $set: { autoAbsentAppliedAt: now } });
  });

  it('marks nobody when the session was not run through the platform', async () => {
    const { service, sessionModel } = noShowSetup([]);
    await service.markNoShows(now);
    expect(sessionModel.updateOne).toHaveBeenCalledWith(FILTER, { $set: { autoAbsentAppliedAt: now } });
  });

  it('leaves the session for the next sweep when a manual mark landed in between (the guarded update matches nothing)', async () => {
    const { service, sessionModel } = noShowSetup([{ userId: A, role: PresenceRole.STUDENT }]);
    sessionModel.updateOne.mockImplementation(() => mockQuery({ matchedCount: 0, modifiedCount: 0 }));
    expect(await service.markNoShows(now)).toBe(0);
  });
});
