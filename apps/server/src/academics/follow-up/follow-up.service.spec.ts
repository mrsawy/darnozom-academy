import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, FollowUpDecision, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { FollowUpService } from './follow-up.service';

const ORG = new Types.ObjectId('64b0000000000000000000bb');
const id = (n: number) => new Types.ObjectId(`64b0000000000000000000${String(n).padStart(2, '0')}`);
const GROUP = id(10);
const FOLLOW_UP = id(20);
const STUDENT = id(2);
const actor: AcademicsActor = { _id: String(id(90)), organizationId: String(ORG), roleName: Roles.COORDINATOR, additionalRoles: [] };

const row = (over: Record<string, unknown> = {}) => ({ _id: FOLLOW_UP, organizationId: ORG, groupId: GROUP, sessionId: id(11), studentId: STUDENT, ...over });

function setup() {
  const followUpModel = { find: jest.fn(), findOne: jest.fn(), updateOne: jest.fn().mockReturnValue(mockQuery({ modifiedCount: 1 })) };
  const groupModel = { findOne: jest.fn() };
  const userModel = { find: jest.fn().mockReturnValue(mockQuery([{ _id: STUDENT, firstName: 'Amal', lastName: 'K' }])) };
  const groupStudents = { markWithdrawn: jest.fn().mockResolvedValue(undefined) };
  const service = new FollowUpService(followUpModel as never, groupModel as never, userModel as never, groupStudents as never);
  return { service, followUpModel, groupModel, userModel, groupStudents };
}

describe('FollowUpService.list', () => {
  it("lists a group's rows with student names, only inside the actor organization", async () => {
    const { service, followUpModel, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery({ _id: GROUP }));
    followUpModel.find.mockReturnValue(mockQuery([row()]));
    const result = await service.list(actor, String(GROUP));
    expect(groupModel.findOne.mock.calls[0][0]).toMatchObject({ _id: GROUP, organizationId: ORG });
    expect(followUpModel.find).toHaveBeenCalledWith({ groupId: GROUP, organizationId: ORG });
    expect(result.rows).toHaveLength(1);
    expect(result.people[String(STUDENT)]).toBe('Amal K');
  });

  it('404s for a group outside the organization', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.list(actor, String(GROUP))).rejects.toThrow(new NotFoundException(AcademicsErrors.GROUP_NOT_FOUND));
  });
});

describe('FollowUpService.update', () => {
  it('records the feedback and decision with who and when', async () => {
    const { service, followUpModel, groupStudents } = setup();
    followUpModel.findOne.mockReturnValueOnce(mockQuery(row())).mockReturnValueOnce(mockQuery(row({ decision: FollowUpDecision.CONTINUE })));
    await service.update(actor, String(FOLLOW_UP), { parentFeedback: '  very happy ', decision: FollowUpDecision.CONTINUE });
    const [filter, update] = followUpModel.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: FOLLOW_UP });
    expect(update.$set).toMatchObject({ parentFeedback: 'very happy', decision: FollowUpDecision.CONTINUE, recordedBy: new Types.ObjectId(actor._id) });
    expect(update.$set.recordedAt).toBeInstanceOf(Date);
    expect(groupStudents.markWithdrawn).not.toHaveBeenCalled();
  });

  it('WITHDRAW sets the student to WITHDRAWN in the group', async () => {
    const { service, followUpModel, groupStudents } = setup();
    followUpModel.findOne.mockReturnValue(mockQuery(row()));
    await service.update(actor, String(FOLLOW_UP), { decision: FollowUpDecision.WITHDRAW });
    expect(groupStudents.markWithdrawn).toHaveBeenCalledWith(GROUP, String(STUDENT));
  });

  it('only writes the fields that were sent', async () => {
    const { service, followUpModel } = setup();
    followUpModel.findOne.mockReturnValue(mockQuery(row()));
    await service.update(actor, String(FOLLOW_UP), { parentFeedback: 'note' });
    expect(followUpModel.updateOne.mock.calls[0][1].$set.decision).toBeUndefined();
  });

  it('404s for a follow-up outside the organization', async () => {
    const { service, followUpModel, groupStudents } = setup();
    followUpModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.update(actor, String(FOLLOW_UP), { decision: FollowUpDecision.WITHDRAW })).rejects.toThrow(new NotFoundException(AcademicsErrors.FOLLOW_UP_NOT_FOUND));
    expect(followUpModel.findOne.mock.calls[0][0]).toEqual({ _id: FOLLOW_UP, organizationId: ORG });
    expect(groupStudents.markWithdrawn).not.toHaveBeenCalled();
  });
});
