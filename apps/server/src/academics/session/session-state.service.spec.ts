import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AcademicsErrors, GroupStudentStatus, Roles, SessionStatus } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { SessionStateService } from './session-state.service';

const ORG = '64b0000000000000000000bb';
const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: ORG, roleName: Roles.COORDINATOR, additionalRoles: [] };
const sessionId = new Types.ObjectId('64b000000000000000000011');
const groupId = new Types.ObjectId('64b000000000000000000022');
const a = new Types.ObjectId('64b0000000000000000000a1');
const b = new Types.ObjectId('64b0000000000000000000a2');

function setup() {
  const sessionModel = { findOne: jest.fn() };
  const groupModel = { findOne: jest.fn() };
  return { service: new SessionStateService(sessionModel as never, groupModel as never), sessionModel, groupModel };
}

describe('SessionStateService', () => {
  it('loads a session only inside the actor organization', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery({ _id: sessionId }));
    await service.loadInOrg(actor, String(sessionId));
    expect(sessionModel.findOne).toHaveBeenCalledWith({ _id: sessionId, organizationId: new Types.ObjectId(ORG) });
  });

  it('404s when the session is not in the organization', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.loadInOrg(actor, String(sessionId))).rejects.toThrow(new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND));
  });

  it('lists ACTIVE students only (legacy entries without a status are active)', async () => {
    const { service, groupModel } = setup();
    groupModel.findOne.mockReturnValue(
      mockQuery({ students: [{ studentId: a, status: GroupStudentStatus.ACTIVE }, { studentId: b, status: GroupStudentStatus.WITHDRAWN }, { studentId: new Types.ObjectId() }] })
    );
    const ids = await service.activeStudentIds(groupId);
    expect(ids).toHaveLength(2);
    expect(ids).toContain(String(a));
    expect(ids).not.toContain(String(b));
  });

  it('derives REPORT_PENDING in the view once the session has ended', () => {
    const { service } = setup();
    const session = { _id: sessionId, status: SessionStatus.SCHEDULED, endsAt: new Date('2026-10-12T15:00:00Z') } as never;
    expect(service.toView(session, new Date('2026-10-12T15:00:00Z')).status).toBe(SessionStatus.REPORT_PENDING);
    expect(service.toView(session, new Date('2026-10-12T14:59:00Z')).status).toBe(SessionStatus.SCHEDULED);
  });
});
