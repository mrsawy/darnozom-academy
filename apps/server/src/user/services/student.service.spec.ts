import mongoose from 'mongoose';
import { AccessType, ActiveStatus, ApprovalStatus, CalendarAppointmentType, CourseContentType, PublishStatus } from '@darnozom/shared-types';
import { SubscriptionStatus } from 'src/utils/enums/subscriptionStatus.enum';
import { CalendarAppointment, StudentService } from './student.service';

interface PrivateStudentService {
  resolveTimeFrame: (fromDate?: string, toDate?: string) => { start: Date; end: Date };
  buildActiveEnrollmentMatch: (
    studentId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId | undefined,
    now?: Date
  ) => Record<string, unknown>;
  getScheduleAppointments: (studentId: mongoose.Types.ObjectId, courses: unknown[], start: Date, end: Date) => CalendarAppointment[];
  buildContentAppointments: (coursesWithContent: unknown[], start: Date, end: Date) => Promise<CalendarAppointment[]>;
  expandWeeklySlot: (dayOfWeek: string, startTime: string, endTime: string, rangeStart: Date, rangeEnd: Date) => { slotStart: Date; slotEnd: Date }[];
  getPrivateSessionAppointments: (
    studentId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId | undefined,
    start: Date,
    end: Date
  ) => Promise<CalendarAppointment[]>;
}

function createService(overrides?: { courseModuleModel?: { find: jest.Mock }; sessionBookingModel?: { find: jest.Mock } }): StudentService {
  const courseModuleModel = overrides?.courseModuleModel ?? {
    find: jest.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) }),
  };
  const sessionBookingModel = overrides?.sessionBookingModel ?? {
    find: jest.fn(),
  };

  return new (StudentService as unknown as new (...args: unknown[]) => StudentService)(
    {}, // enrollmentModel
    {}, // courseModel
    courseModuleModel,
    sessionBookingModel,
    {} // privateSessionModel
  );
}

function asPrivate(service: StudentService): PrivateStudentService {
  return service as unknown as PrivateStudentService;
}

describe('StudentService.buildActiveEnrollmentMatch', () => {
  const service = createService();
  const priv = asPrivate(service);
  const studentId = new mongoose.Types.ObjectId();
  const now = new Date('2026-07-26T12:00:00.000Z');

  it('excludes subscription enrollments that are expired by status or ends_at', () => {
    const match = priv.buildActiveEnrollmentMatch(studentId, undefined, now);
    expect(match.userId).toEqual(studentId);
    expect(match.$nor).toEqual([
      {
        accessType: AccessType.SUBSCRIPTION,
        $or: [{ 'subscription.status': SubscriptionStatus.EXPIRED }, { 'subscription.ends_at': { $lt: now } }],
      },
    ]);
  });

  it('scopes by organization when provided', () => {
    const orgId = new mongoose.Types.ObjectId();
    const match = priv.buildActiveEnrollmentMatch(studentId, orgId, now);
    expect(match.organizationId).toEqual(orgId);
  });
});

describe('StudentService.resolveTimeFrame', () => {
  const service = createService();
  const priv = asPrivate(service);

  it('extends a midnight UTC toDate to end-of-UTC-day', () => {
    const { start, end } = priv.resolveTimeFrame('2026-07-01T00:00:00.000Z', '2026-07-31T00:00:00.000Z');
    expect(start.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-31T23:59:59.999Z');
  });

  it('leaves an already end-of-day toDate unchanged', () => {
    const { end } = priv.resolveTimeFrame('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z');
    expect(end.toISOString()).toBe('2026-07-31T23:59:59.999Z');
  });

  it('defaults to the current UTC month when no range is provided', () => {
    const { start, end } = priv.resolveTimeFrame();
    const now = new Date();
    expect(start.toISOString()).toBe(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString());
    expect(end.toISOString()).toBe(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)).toISOString());
  });
});

describe('StudentService.expandWeeklySlot / parseTimeOnDate (UTC-safe)', () => {
  const service = createService();
  const priv = asPrivate(service);

  it('expands a Monday slot using UTC calendar days and UTC wall-clock times', () => {
    // 2026-07-01 is a Wednesday UTC. First Monday in range is 2026-07-06.
    const rangeStart = new Date('2026-07-01T00:00:00.000Z');
    const rangeEnd = new Date('2026-07-31T23:59:59.999Z');
    const occurrences = priv.expandWeeklySlot('Monday', '02:00 pm', '04:00 pm', rangeStart, rangeEnd);

    expect(occurrences.length).toBeGreaterThan(0);
    expect(occurrences[0].slotStart.toISOString()).toBe('2026-07-06T14:00:00.000Z');
    expect(occurrences[0].slotEnd.toISOString()).toBe('2026-07-06T16:00:00.000Z');
    // All starts should be Mondays in UTC
    for (const { slotStart } of occurrences) {
      expect(slotStart.getUTCDay()).toBe(1);
    }
  });
});

describe('StudentService.getScheduleAppointments', () => {
  const service = createService();
  const priv = asPrivate(service);
  const studentId = new mongoose.Types.ObjectId();
  const courseId = new mongoose.Types.ObjectId();
  const rangeStart = new Date('2026-07-01T00:00:00.000Z');
  const rangeEnd = new Date('2026-07-31T23:59:59.999Z');

  it('skips soft-deleted attendance slots', () => {
    const courses = [
      {
        _id: courseId,
        name: 'Math',
        attendanceSettings: {
          requireAttendance: true,
          offlineSchedule: [
            {
              _id: new mongoose.Types.ObjectId(),
              dayOfWeek: 'Monday',
              startTime: '10:00 am',
              endTime: '11:00 am',
              deletedAt: new Date('2026-06-01T00:00:00.000Z'),
            },
            {
              _id: new mongoose.Types.ObjectId(),
              dayOfWeek: 'Wednesday',
              startTime: '10:00 am',
              endTime: '11:00 am',
              deletedAt: null,
            },
          ],
        },
      },
    ];

    const appointments = priv.getScheduleAppointments(studentId, courses, rangeStart, rangeEnd);
    expect(appointments.every((a) => a.meta?.dayOfWeek === 'Wednesday')).toBe(true);
    expect(appointments.every((a) => a.type === CalendarAppointmentType.ATTENDANCE)).toBe(true);
  });
});

describe('StudentService.buildContentAppointments', () => {
  const service = createService();
  const priv = asPrivate(service);
  const courseId = new mongoose.Types.ObjectId();
  const rangeStart = new Date('2026-07-01T00:00:00.000Z');
  const rangeEnd = new Date('2026-07-31T23:59:59.999Z');

  const servable = {
    publishStatus: PublishStatus.PUBLISHED,
    approvalStatus: ApprovalStatus.APPROVED,
    activeStatus: ActiveStatus.ACTIVE,
  };

  it('excludes unpublished / unapproved / inactive content', async () => {
    const courses = [
      {
        _id: courseId,
        name: 'Physics',
        contents: [
          {
            _id: new mongoose.Types.ObjectId(),
            type: CourseContentType.ASSIGNMENT,
            title: 'Draft HW',
            dueDate: new Date('2026-07-15T12:00:00.000Z'),
            publishStatus: PublishStatus.DRAFT,
            approvalStatus: ApprovalStatus.APPROVED,
            activeStatus: ActiveStatus.ACTIVE,
          },
          {
            _id: new mongoose.Types.ObjectId(),
            type: CourseContentType.ASSIGNMENT,
            title: 'Live HW',
            dueDate: new Date('2026-07-16T12:00:00.000Z'),
            ...servable,
          },
        ],
      },
    ];

    const appointments = await priv.buildContentAppointments(courses, rangeStart, rangeEnd);
    expect(appointments).toHaveLength(1);
    expect(appointments[0].title).toBe('Live HW');
    expect(appointments[0].type).toBe(CalendarAppointmentType.ASSIGNMENT);
  });
});

describe('StudentService.getPrivateSessionAppointments', () => {
  it('maps bookings to PRIVATE_SESSION appointments without unsafe casts', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    const sessionId = new mongoose.Types.ObjectId();
    const instructorId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    const startsAt = new Date('2026-07-10T10:00:00.000Z');
    const endsAt = new Date('2026-07-10T11:00:00.000Z');

    const bookingDoc = {
      _id: bookingId,
      sessionId,
      instructorId,
      startsAt,
      endsAt,
      timezone: 'Africa/Cairo',
      status: 'CONFIRMED',
      provider: 'AGORA',
      agoraChannelName: 'ch-1',
      get: (path: string) => (path === 'session' ? { title: 'Tutoring' } : undefined),
    };

    const findMock = jest.fn().mockReturnValue({
      populate: () => ({
        sort: () => Promise.resolve([bookingDoc]),
      }),
    });

    const service = createService({ sessionBookingModel: { find: findMock } });
    const priv = asPrivate(service);

    const appointments = await priv.getPrivateSessionAppointments(
      studentId,
      undefined,
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-31T23:59:59.999Z')
    );

    expect(appointments).toHaveLength(1);
    expect(appointments[0].type).toBe(CalendarAppointmentType.PRIVATE_SESSION);
    expect(appointments[0].title).toBe('Tutoring');
    expect(appointments[0].date).toBe(startsAt);
    expect(appointments[0].endDate).toBe(endsAt);
    expect(appointments[0].meta).toMatchObject({
      bookingId: bookingId.toString(),
      sessionId: sessionId.toString(),
      instructorId: instructorId.toString(),
      provider: 'AGORA',
    });
  });
});
