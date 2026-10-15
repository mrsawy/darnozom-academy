import { Types } from 'mongoose';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, CommonErrors, PayStatementStatus, PayrollErrors, Roles } from '@darnozom/shared-types';
import { DisputeActor, SessionDisputeService } from './session-dispute.service';

interface MockSessionDoc {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  teacherId: Types.ObjectId;
  startsAt: Date;
  disputed: boolean;
  disputeReason?: string;
  disputedBy?: Types.ObjectId;
  disputedAt?: Date;
  disputeResolvedBy?: Types.ObjectId;
  disputeResolvedAt?: Date;
  save: () => Promise<MockSessionDoc>;
}

describe('SessionDisputeService', () => {
  let service: SessionDisputeService;
  let sessionModel: { findById: jest.Mock };
  let payStatementModel: { findOne: jest.Mock };
  let organizationModel: { findById: jest.Mock };

  const orgId = new Types.ObjectId();
  const teacherId = new Types.ObjectId();
  const sessionId = new Types.ObjectId();
  const actorId = new Types.ObjectId().toString();

  const supervisorActor: DisputeActor = {
    _id: actorId,
    organizationId: orgId.toString(),
    roleName: Roles.SUPERVISOR,
    additionalRoles: [],
  };

  const studentActor: DisputeActor = {
    _id: new Types.ObjectId().toString(),
    organizationId: orgId.toString(),
    roleName: Roles.STUDENT,
    additionalRoles: [],
  };

  const baseSession: MockSessionDoc = {
    _id: sessionId,
    organizationId: orgId,
    teacherId,
    startsAt: new Date('2026-10-15T10:00:00.000Z'),
    disputed: false,
    disputeReason: undefined,
    disputedBy: undefined,
    disputedAt: undefined,
    disputeResolvedBy: undefined,
    disputeResolvedAt: undefined,
    save: jest.fn().mockImplementation(function (this: MockSessionDoc) {
      return Promise.resolve(this);
    }),
  };

  beforeEach(() => {
    sessionModel = {
      findById: jest.fn(),
    };
    payStatementModel = {
      findOne: jest.fn(),
    };
    organizationModel = {
      findById: jest.fn().mockResolvedValue({ timezone: 'UTC' }),
    };

    service = new SessionDisputeService(sessionModel as never, payStatementModel as never, organizationModel as never);
  });

  describe('disputeSession', () => {
    it('successfully disputes a session', async () => {
      const session = { ...baseSession, disputed: false, save: jest.fn().mockResolvedValue(true) };
      sessionModel.findById.mockResolvedValue(session);
      payStatementModel.findOne.mockResolvedValue(null);

      await service.disputeSession(sessionId.toString(), 'Teacher was absent', supervisorActor);

      expect(session.disputed).toBe(true);
      expect(session.disputeReason).toBe('Teacher was absent');
      expect(session.disputedBy?.toString()).toBe(actorId);
      expect(session.disputedAt).toBeDefined();
      expect(session.save).toHaveBeenCalled();
    });

    it('rejects empty dispute reason', async () => {
      await expect(service.disputeSession(sessionId.toString(), '   ', supervisorActor)).rejects.toThrow(
        new BadRequestException(PayrollErrors.DISPUTE_REASON_REQUIRED)
      );
    });

    it('rejects unauthorized actor', async () => {
      await expect(service.disputeSession(sessionId.toString(), 'Reason', studentActor)).rejects.toThrow(
        new ForbiddenException(CommonErrors.FORBIDDEN)
      );
    });

    it('rejects if session not found', async () => {
      sessionModel.findById.mockResolvedValue(null);

      await expect(service.disputeSession(sessionId.toString(), 'Reason', supervisorActor)).rejects.toThrow(
        new NotFoundException(AcademicsErrors.SESSION_NOT_FOUND)
      );
    });

    it('rejects if session is already disputed', async () => {
      sessionModel.findById.mockResolvedValue({ ...baseSession, disputed: true });

      await expect(service.disputeSession(sessionId.toString(), 'Reason', supervisorActor)).rejects.toThrow(
        new ConflictException(PayrollErrors.SESSION_ALREADY_DISPUTED)
      );
    });

    it('blocks dispute if an approved statement exists for the teacher in that month', async () => {
      sessionModel.findById.mockResolvedValue({ ...baseSession, disputed: false });
      payStatementModel.findOne.mockResolvedValue({
        status: PayStatementStatus.APPROVED,
      });

      await expect(service.disputeSession(sessionId.toString(), 'Reason', supervisorActor)).rejects.toThrow(
        new ConflictException(PayrollErrors.DISPUTE_BLOCKED_MONTH_APPROVED)
      );

      expect(payStatementModel.findOne).toHaveBeenCalledWith({
        organizationId: orgId,
        teacherId,
        month: '2026-10',
        status: { $in: [PayStatementStatus.APPROVED, PayStatementStatus.PAID] },
      });
    });
  });

  describe('resolveDispute', () => {
    it('successfully resolves an existing dispute', async () => {
      const session = {
        ...baseSession,
        disputed: true,
        disputeReason: 'Teacher absent',
        save: jest.fn().mockResolvedValue(true),
      };
      sessionModel.findById.mockResolvedValue(session);
      payStatementModel.findOne.mockResolvedValue(null);

      await service.resolveDispute(sessionId.toString(), supervisorActor);

      expect(session.disputed).toBe(false);
      expect(session.disputeResolvedBy?.toString()).toBe(actorId);
      expect(session.disputeResolvedAt).toBeDefined();
      expect(session.save).toHaveBeenCalled();
    });

    it('rejects resolve if session is not disputed', async () => {
      sessionModel.findById.mockResolvedValue({ ...baseSession, disputed: false });

      await expect(service.resolveDispute(sessionId.toString(), supervisorActor)).rejects.toThrow(
        new ConflictException(PayrollErrors.SESSION_NOT_DISPUTED)
      );
    });

    it('blocks resolve if an approved statement exists for the teacher in that month', async () => {
      sessionModel.findById.mockResolvedValue({ ...baseSession, disputed: true });
      payStatementModel.findOne.mockResolvedValue({
        status: PayStatementStatus.PAID,
      });

      await expect(service.resolveDispute(sessionId.toString(), supervisorActor)).rejects.toThrow(
        new ConflictException(PayrollErrors.DISPUTE_BLOCKED_MONTH_APPROVED)
      );
    });
  });
});
