import { FamilyPaymentStatus, GroupPaymentStatus, GroupStudentStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { computeReadiness } from '../domain/readiness';

const ACTIVE = new Types.ObjectId();
const WITHDRAWN = new Types.ObjectId();

describe('readiness over the derived payment status', () => {
  it('is ready when every active student is paid', () => {
    const group = {
      teacherId: new Types.ObjectId(),
      minStudents: 1,
      students: [{ studentId: ACTIVE, paymentStatus: FamilyPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE }],
      contentSent: { done: true },
      meetingLink: 'https://meet.example/a',
    };
    expect(computeReadiness(group).ready).toBe(true);
  });

  it('is not ready while an active student is unpaid', () => {
    const group = {
      teacherId: new Types.ObjectId(),
      minStudents: 1,
      students: [{ studentId: ACTIVE, paymentStatus: FamilyPaymentStatus.UNPAID, status: GroupStudentStatus.ACTIVE }],
      contentSent: { done: true },
      meetingLink: 'https://meet.example/a',
    };
    expect(computeReadiness(group).ready).toBe(false);
  });

  it('ignores a withdrawn student who never paid, so one leaver cannot freeze a group', () => {
    const group = {
      teacherId: new Types.ObjectId(),
      minStudents: 1,
      students: [
        { studentId: ACTIVE, paymentStatus: FamilyPaymentStatus.PAID, status: GroupStudentStatus.ACTIVE },
        { studentId: WITHDRAWN, paymentStatus: FamilyPaymentStatus.UNPAID, status: GroupStudentStatus.WITHDRAWN },
      ],
      contentSent: { done: true },
      meetingLink: 'https://meet.example/a',
    };
    expect(computeReadiness(group).ready).toBe(true);
  });

  it('reads the same two values the group schema already used, so the enum change is a rename only', () => {
    expect(FamilyPaymentStatus.PAID).toBe(GroupPaymentStatus.PAID);
    expect(FamilyPaymentStatus.UNPAID).toBe(GroupPaymentStatus.UNPAID);
  });
});
