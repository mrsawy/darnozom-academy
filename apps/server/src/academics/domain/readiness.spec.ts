import { GroupPaymentStatus, ReadinessKey } from '@darnozom/shared-types';
import { computeReadiness } from './readiness';

const complete = {
  teacherId: 'teacher',
  minStudents: 2,
  students: [{ paymentStatus: GroupPaymentStatus.PAID }, { paymentStatus: GroupPaymentStatus.PAID }],
  contentSent: { done: true },
  meetingLink: 'https://meet.example/abc',
};

const doneOf = (group: Parameters<typeof computeReadiness>[0], key: ReadinessKey) => computeReadiness(group).items.find((i) => i.key === key)?.done;

describe('computeReadiness', () => {
  it('is ready when all five items are done, in the concept order', () => {
    const result = computeReadiness(complete);
    expect(result.ready).toBe(true);
    expect(result.items.map((i) => i.key)).toEqual([
      ReadinessKey.TEACHER_ASSIGNED,
      ReadinessKey.MINIMUM_STUDENTS,
      ReadinessKey.PAYMENTS_MADE,
      ReadinessKey.CONTENT_SENT,
      ReadinessKey.MEETING_LINK,
    ]);
  });
  it('flags each missing item', () => {
    expect(doneOf({ ...complete, teacherId: null }, ReadinessKey.TEACHER_ASSIGNED)).toBe(false);
    expect(doneOf({ ...complete, minStudents: 3 }, ReadinessKey.MINIMUM_STUDENTS)).toBe(false);
    expect(
      doneOf(
        { ...complete, students: [{ paymentStatus: GroupPaymentStatus.PAID }, { paymentStatus: GroupPaymentStatus.UNPAID }] },
        ReadinessKey.PAYMENTS_MADE
      )
    ).toBe(false);
    expect(doneOf({ ...complete, contentSent: { done: false } }, ReadinessKey.CONTENT_SENT)).toBe(false);
    expect(doneOf({ ...complete, meetingLink: '   ' }, ReadinessKey.MEETING_LINK)).toBe(false);
    expect(computeReadiness({ ...complete, meetingLink: undefined }).ready).toBe(false);
  });
  it('does not count payments as made when there are no students', () => {
    expect(doneOf({ ...complete, students: [] }, ReadinessKey.PAYMENTS_MADE)).toBe(false);
  });
});
