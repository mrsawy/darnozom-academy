import { AttendanceStatus, BillingSubscriptionStatus, Currency, GroupStudentStatus, SessionStatus, SubscriptionType } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { perSessionIdempotencyKey } from '../domain/charge-schedule';
import { SessionChargesService } from './session-charges.service';

const ORG = new Types.ObjectId();
const GROUP = new Types.ObjectId();
const SESSION = new Types.ObjectId();
const SUB = new Types.ObjectId();
const PRESENT = new Types.ObjectId();
const ABSENT = new Types.ObjectId();
const LEAVER = new Types.ObjectId();
const FAMILY = new Types.ObjectId();

const session = (status = SessionStatus.COMPLETED) => ({
  _id: SESSION,
  organizationId: ORG,
  groupId: GROUP,
  status,
  attendance: [
    { studentId: PRESENT, status: AttendanceStatus.PRESENT },
    { studentId: ABSENT, status: AttendanceStatus.ABSENT },
  ],
});

const makeService = (
  sessionDoc: Record<string, unknown> | null = session(),
  subscriptions = [
    {
      _id: SUB,
      familyId: FAMILY,
      amountMinor: 2000,
      currency: Currency.EGP,
      type: SubscriptionType.PER_SESSION,
      status: BillingSubscriptionStatus.ACTIVE,
      items: [{ studentId: PRESENT, groupId: GROUP }],
    },
    {
      _id: new Types.ObjectId(),
      familyId: FAMILY,
      amountMinor: 2000,
      currency: Currency.EGP,
      type: SubscriptionType.PER_SESSION,
      status: BillingSubscriptionStatus.ACTIVE,
      items: [{ studentId: ABSENT, groupId: GROUP }],
    },
  ]
) => {
  const sessionModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => sessionDoc }) })) };
  const groupModel = {
    findOne: jest.fn(() => ({
      lean: () => ({
        exec: async () => ({
          _id: GROUP,
          organizationId: ORG,
          students: [
            { studentId: PRESENT, status: GroupStudentStatus.ACTIVE },
            { studentId: ABSENT, status: GroupStudentStatus.ACTIVE },
            { studentId: LEAVER, status: GroupStudentStatus.WITHDRAWN },
          ],
        }),
      }),
    })),
  };
  const subscriptionModel = { find: jest.fn(() => ({ lean: () => ({ exec: async () => subscriptions }) })) };
  const ledger = { postCharges: jest.fn(async (input: { charges: unknown[] }) => input.charges) };
  const service = new SessionChargesService(sessionModel as never, groupModel as never, subscriptionModel as never, ledger as never);
  return { service, ledger };
};

describe('SessionChargesService.onSessionCompleted', () => {
  it('charges a student who attended', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { studentId: string }[] }).charges);
    expect(charged.map((charge) => charge.studentId)).toContain(String(PRESENT));
  });

  it('charges a student who was absent, because a reserved seat is billable', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { studentId: string }[] }).charges);
    expect(charged.map((charge) => charge.studentId)).toContain(String(ABSENT));
  });

  it('does not charge a withdrawn student', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { studentId: string }[] }).charges);
    expect(charged.map((charge) => charge.studentId)).not.toContain(String(LEAVER));
  });

  it('charges nothing for a cancelled session', async () => {
    const { service, ledger } = makeService(session(SessionStatus.CANCELLED));
    await expect(service.onSessionCompleted(String(SESSION))).resolves.toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('charges nothing for a session that has not completed', async () => {
    const { service, ledger } = makeService(session(SessionStatus.REPORT_PENDING));
    await expect(service.onSessionCompleted(String(SESSION))).resolves.toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('charges only PER_SESSION subscriptions', async () => {
    const { service, ledger } = makeService(session(), [
      {
        _id: SUB,
        familyId: FAMILY,
        amountMinor: 50_000,
        currency: Currency.EGP,
        type: SubscriptionType.FULL_COURSE,
        status: BillingSubscriptionStatus.ACTIVE,
        items: [{ studentId: PRESENT, groupId: GROUP }],
      },
    ]);
    await expect(service.onSessionCompleted(String(SESSION))).resolves.toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });

  it('keys each charge on the subscription, session and student, so a replay posts nothing', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { idempotencyKey: string }[] }).charges);
    expect(charged.map((charge) => charge.idempotencyKey)).toContain(perSessionIdempotencyKey(String(SUB), String(SESSION), String(PRESENT)));
  });

  it('dues a per-session charge immediately', async () => {
    const { service, ledger } = makeService();
    await service.onSessionCompleted(String(SESSION));
    const charged = ledger.postCharges.mock.calls.flatMap((call) => (call[0] as { charges: { dueAt: Date }[] }).charges);
    expect(charged[0].dueAt).toBeInstanceOf(Date);
  });

  it('returns 0 for a session it cannot find', async () => {
    const { service, ledger } = makeService(null);
    await expect(service.onSessionCompleted(String(SESSION))).resolves.toBe(0);
    expect(ledger.postCharges).not.toHaveBeenCalled();
  });
});
