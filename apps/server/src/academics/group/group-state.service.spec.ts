import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, FamilyPaymentStatus, GroupPaymentStatus, GroupStatus, READINESS_LOST_REASON, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { GroupStateService } from './group-state.service';

const actor: AcademicsActor = {
  _id: '64b0000000000000000000aa',
  organizationId: '64b0000000000000000000bb',
  roleName: Roles.COORDINATOR,
  additionalRoles: [],
};
const groupId = new Types.ObjectId('64b000000000000000000011');

const group = (over: Record<string, unknown> = {}) => ({
  _id: groupId,
  status: GroupStatus.FORMING,
  teacherId: null,
  minStudents: 1,
  students: [],
  contentSent: { done: false },
  meetingLink: null,
  ...over,
});

function setup() {
  const groupModel = { findOne: jest.fn(), updateOne: jest.fn() };
  const cohortModel = { findOne: jest.fn().mockReturnValue(mockQuery(null)) };
  const paymentStatus = { forGroup: jest.fn().mockResolvedValue(new Map()), hasPendingReview: jest.fn().mockResolvedValue(new Set()) };
  const taskClosing = { closeDoneItems: jest.fn(async () => 0), closeAll: jest.fn(async () => 0) };
  return {
    service: new GroupStateService(groupModel as never, cohortModel as never, paymentStatus as never, taskClosing as never),
    groupModel,
    cohortModel,
    paymentStatus,
  };
}

describe('GroupStateService', () => {
  it('404s for groups outside the actor organization', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.loadInOrg(actor, String(groupId))).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
    expect(String(groupModel.findOne.mock.calls[0][0].organizationId)).toBe(actor.organizationId);
  });

  it('refuses writes to cancelled groups', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(group({ status: GroupStatus.CANCELLED })));
    await expect(service.loadForWrite(actor, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_CANCELLED));
  });

  it('reverts a READY_TO_START group that lost readiness', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(group({ status: GroupStatus.READY_TO_START })));
    groupModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));

    const view = await service.syncReadiness(groupId);

    expect(view.status).toBe(GroupStatus.FORMING);
    expect(view.readiness.ready).toBe(false);
    const [filter, update] = groupModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: groupId, status: GroupStatus.READY_TO_START });
    expect(update.$set).toEqual({ status: GroupStatus.FORMING });
    expect(update.$push.statusHistory).toMatchObject({
      from: GroupStatus.READY_TO_START,
      to: GroupStatus.FORMING,
      by: null,
      reason: READINESS_LOST_REASON,
    });
  });

  it('leaves a group that is still ready alone', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(
      mockQuery(
        group({
          status: GroupStatus.READY_TO_START,
          teacherId: new Types.ObjectId(),
          students: [{ paymentStatus: 'PAID' }],
          contentSent: { done: true },
          meetingLink: 'https://m.example/x',
        })
      )
    );
    const view = await service.syncReadiness(groupId);
    expect(view.status).toBe(GroupStatus.READY_TO_START);
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });
});

describe('GroupStateService on completed groups', () => {
  it('treats a COMPLETED group as read-only for writes', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(group({ status: GroupStatus.COMPLETED })));
    await expect(service.loadForWrite(actor, String(groupId))).rejects.toThrow(new ConflictException(AcademicsErrors.GROUP_COMPLETED));
  });
});

describe('GroupStateService.withDerivedPaymentStatus', () => {
  const studentId = new Types.ObjectId();

  it('shows UNDER_REVIEW for an unpaid student with a pending manual-transfer payment', async () => {
    const { service, paymentStatus } = setup();
    paymentStatus.forGroup.mockResolvedValueOnce(new Map([[String(studentId), FamilyPaymentStatus.UNPAID]]));
    paymentStatus.hasPendingReview.mockResolvedValueOnce(new Set([String(studentId)]));

    const result = await service.withDerivedPaymentStatus(group({ students: [{ studentId, paymentStatus: GroupPaymentStatus.UNPAID }] }) as never);

    expect(result.students[0].paymentStatus).toBe(GroupPaymentStatus.UNDER_REVIEW);
  });

  it('never overrides PAID with UNDER_REVIEW', async () => {
    const { service, paymentStatus } = setup();
    paymentStatus.forGroup.mockResolvedValueOnce(new Map([[String(studentId), FamilyPaymentStatus.PAID]]));
    paymentStatus.hasPendingReview.mockResolvedValueOnce(new Set([String(studentId)]));

    const result = await service.withDerivedPaymentStatus(group({ students: [{ studentId, paymentStatus: GroupPaymentStatus.UNPAID }] }) as never);

    expect(result.students[0].paymentStatus).toBe(GroupPaymentStatus.PAID);
  });

  it('leaves UNPAID alone when there is no pending payment', async () => {
    const { service, paymentStatus } = setup();
    paymentStatus.forGroup.mockResolvedValueOnce(new Map([[String(studentId), FamilyPaymentStatus.UNPAID]]));
    paymentStatus.hasPendingReview.mockResolvedValueOnce(new Set());

    const result = await service.withDerivedPaymentStatus(group({ students: [{ studentId, paymentStatus: GroupPaymentStatus.UNPAID }] }) as never);

    expect(result.students[0].paymentStatus).toBe(GroupPaymentStatus.UNPAID);
  });
});
