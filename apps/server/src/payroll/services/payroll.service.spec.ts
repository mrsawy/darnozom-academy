import { Types } from 'mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Currency, GroupStudentStatus, PayStatementStatus, PayrollErrors, Roles, SessionStatus, TeacherPayModel } from '@darnozom/shared-types';
import { PayrollService } from './payroll.service';
import { DisputeActor } from './session-dispute.service';

interface MockDoc {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  teacherId?: Types.ObjectId;
  month?: string;
  status?: PayStatementStatus;
  baseAmount?: number;
  total?: number;
  bonuses?: { amount: number; reason: string; addedBy: Types.ObjectId; addedAt: Date }[];
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  paidBy?: Types.ObjectId;
  paidAt?: Date;
  paymentReference?: string;
  save: () => Promise<MockDoc>;
}

describe('PayrollService', () => {
  let service: PayrollService;
  let payStatementModel: {
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
  };
  let profileService: {
    getProfiles: jest.Mock;
    findEffectiveProfile: jest.Mock;
  };
  let sessionModel: { find: jest.Mock };
  let groupModel: { find: jest.Mock };
  let ledgerEntryModel: { find: jest.Mock };
  let allocationModel: { find: jest.Mock };
  let organizationModel: { findById: jest.Mock };

  const orgId = new Types.ObjectId();
  const teacherId = new Types.ObjectId();
  const statementId = new Types.ObjectId();
  const actorId = new Types.ObjectId().toString();

  const accountantActor: DisputeActor = {
    _id: actorId,
    organizationId: orgId.toString(),
    roleName: Roles.ACCOUNTANT,
    additionalRoles: [],
  };

  const instructorActor: DisputeActor = {
    _id: teacherId.toString(),
    organizationId: orgId.toString(),
    roleName: Roles.INSTRUCTOR,
    additionalRoles: [],
  };

  beforeEach(() => {
    payStatementModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    profileService = {
      getProfiles: jest.fn(),
      findEffectiveProfile: jest.fn(),
    };
    sessionModel = { find: jest.fn() };
    groupModel = { find: jest.fn() };
    ledgerEntryModel = { find: jest.fn().mockResolvedValue([]) };
    allocationModel = { find: jest.fn().mockResolvedValue([]) };
    organizationModel = {
      findById: jest.fn().mockResolvedValue({ timezone: 'UTC' }),
    };

    service = new PayrollService(
      payStatementModel as never,
      profileService as never,
      sessionModel as never,
      groupModel as never,
      ledgerEntryModel as never,
      allocationModel as never,
      organizationModel as never
    );
  });

  describe('generateStatements', () => {
    it('generates a draft statement for teacher with countable sessions', async () => {
      profileService.getProfiles.mockResolvedValue([
        {
          teacherId,
          model: TeacherPayModel.PER_SESSION,
          rate: 50,
          currency: Currency.USD,
        },
      ]);

      payStatementModel.findOne.mockResolvedValue(null);
      profileService.findEffectiveProfile.mockResolvedValue({
        model: TeacherPayModel.PER_SESSION,
        rate: 50,
        currency: Currency.USD,
      });

      const groupId = new Types.ObjectId();
      const sessionStarts = new Date('2026-10-10T10:00:00.000Z');
      const sessionEnds = new Date('2026-10-10T11:00:00.000Z');

      sessionModel.find.mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          organizationId: orgId,
          teacherId,
          groupId,
          status: SessionStatus.COMPLETED,
          disputed: false,
          startsAt: sessionStarts,
          endsAt: sessionEnds,
        },
      ]);

      const student1 = new Types.ObjectId();
      groupModel.find.mockResolvedValue([
        {
          _id: groupId,
          students: [{ studentId: student1, status: GroupStudentStatus.ACTIVE }],
        },
      ]);

      const createdStatement: MockDoc = {
        _id: statementId,
        organizationId: orgId,
        teacherId,
        month: '2026-10',
        status: PayStatementStatus.DRAFT,
        baseAmount: 50,
        total: 50,
        save: jest.fn().mockResolvedValue(true),
      };
      payStatementModel.create.mockResolvedValue(createdStatement);

      const result = await service.generateStatements(orgId.toString(), '2026-10');

      expect(result).toHaveLength(1);
      expect(payStatementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          teacherId,
          month: '2026-10',
          baseAmount: 50,
          total: 50,
          status: PayStatementStatus.DRAFT,
          basis: expect.objectContaining({
            sessions: 1,
            minutes: 60,
            students: 1,
          }),
        })
      );
    });

    it('skips statement if already APPROVED or PAID', async () => {
      profileService.getProfiles.mockResolvedValue([{ teacherId, model: TeacherPayModel.FIXED, rate: 1000, currency: Currency.USD }]);
      payStatementModel.findOne.mockResolvedValue({
        status: PayStatementStatus.APPROVED,
      });

      const result = await service.generateStatements(orgId.toString(), '2026-10');
      expect(result).toHaveLength(0);
      expect(payStatementModel.create).not.toHaveBeenCalled();
    });

    it('recalculates existing DRAFT statement preserving bonuses', async () => {
      profileService.getProfiles.mockResolvedValue([{ teacherId, model: TeacherPayModel.FIXED, rate: 1000, currency: Currency.USD }]);

      const existingBonuses = [
        {
          amount: 200,
          reason: 'Hard work',
          addedBy: new Types.ObjectId(),
          addedAt: new Date(),
        },
      ];

      const existingDraft: MockDoc = {
        _id: statementId,
        organizationId: orgId,
        teacherId,
        month: '2026-10',
        status: PayStatementStatus.DRAFT,
        baseAmount: 800,
        bonuses: existingBonuses,
        total: 1000,
        save: jest.fn().mockImplementation(function (this: MockDoc) {
          return Promise.resolve(this);
        }),
      };

      payStatementModel.findOne.mockResolvedValue(existingDraft);
      profileService.findEffectiveProfile.mockResolvedValue({
        model: TeacherPayModel.FIXED,
        rate: 1000,
        currency: Currency.USD,
      });
      sessionModel.find.mockResolvedValue([]);

      const result = await service.generateStatements(orgId.toString(), '2026-10');

      expect(result).toHaveLength(1);
      expect(existingDraft.baseAmount).toBe(1000);
      expect(existingDraft.total).toBe(1200); // 1000 base + 200 bonus
      expect(existingDraft.bonuses).toEqual(existingBonuses);
      expect(existingDraft.save).toHaveBeenCalled();
    });
  });

  describe('addBonus', () => {
    it('adds bonus to a DRAFT statement and updates total', async () => {
      const statement: MockDoc = {
        _id: statementId,
        organizationId: orgId,
        status: PayStatementStatus.DRAFT,
        baseAmount: 500,
        bonuses: [],
        total: 500,
        save: jest.fn().mockImplementation(function (this: MockDoc) {
          return Promise.resolve(this);
        }),
      };
      payStatementModel.findById.mockResolvedValue(statement);

      const result = await service.addBonus(statementId.toString(), { amount: 100, reason: 'Excellent performance' }, accountantActor._id);

      expect(result.bonuses).toHaveLength(1);
      expect(result.bonuses?.[0].amount).toBe(100);
      expect(result.bonuses?.[0].reason).toBe('Excellent performance');
      expect(result.total).toBe(600);
      expect(statement.save).toHaveBeenCalled();
    });

    it('rejects bonus on APPROVED statement', async () => {
      payStatementModel.findById.mockResolvedValue({
        status: PayStatementStatus.APPROVED,
      });

      await expect(service.addBonus(statementId.toString(), { amount: 50, reason: 'Tip' }, accountantActor._id)).rejects.toThrow(
        new ConflictException(PayrollErrors.STATEMENT_ALREADY_APPROVED)
      );
    });

    it('rejects non-positive bonus amount', async () => {
      payStatementModel.findById.mockResolvedValue({
        status: PayStatementStatus.DRAFT,
      });

      await expect(service.addBonus(statementId.toString(), { amount: 0, reason: 'Invalid' }, accountantActor._id)).rejects.toThrow(
        new BadRequestException(PayrollErrors.BONUS_AMOUNT_INVALID)
      );
    });
  });

  describe('approveStatement', () => {
    it('approves a DRAFT statement', async () => {
      const statement: MockDoc = {
        _id: statementId,
        organizationId: orgId,
        status: PayStatementStatus.DRAFT,
        save: jest.fn().mockImplementation(function (this: MockDoc) {
          return Promise.resolve(this);
        }),
      };
      payStatementModel.findById.mockResolvedValue(statement);

      const result = await service.approveStatement(statementId.toString(), accountantActor._id);

      expect(result.status).toBe(PayStatementStatus.APPROVED);
      expect(result.approvedBy?.toString()).toBe(actorId);
      expect(result.approvedAt).toBeDefined();
      expect(statement.save).toHaveBeenCalled();
    });

    it('rejects approving already APPROVED statement', async () => {
      payStatementModel.findById.mockResolvedValue({
        status: PayStatementStatus.APPROVED,
      });

      await expect(service.approveStatement(statementId.toString(), accountantActor._id)).rejects.toThrow(
        new ConflictException(PayrollErrors.STATEMENT_ALREADY_APPROVED)
      );
    });
  });

  describe('markPaid', () => {
    it('marks an APPROVED statement as PAID', async () => {
      const statement: MockDoc = {
        _id: statementId,
        organizationId: orgId,
        status: PayStatementStatus.APPROVED,
        save: jest.fn().mockImplementation(function (this: MockDoc) {
          return Promise.resolve(this);
        }),
      };
      payStatementModel.findById.mockResolvedValue(statement);

      const result = await service.markPaid(statementId.toString(), { paymentReference: 'REF-9988' }, accountantActor._id);

      expect(result.status).toBe(PayStatementStatus.PAID);
      expect(result.paidBy?.toString()).toBe(actorId);
      expect(result.paidAt).toBeDefined();
      expect(result.paymentReference).toBe('REF-9988');
      expect(statement.save).toHaveBeenCalled();
    });

    it('rejects marking DRAFT as paid without approval', async () => {
      payStatementModel.findById.mockResolvedValue({
        status: PayStatementStatus.DRAFT,
      });

      await expect(service.markPaid(statementId.toString(), {}, accountantActor._id)).rejects.toThrow(
        new ConflictException(PayrollErrors.STATEMENT_NOT_APPROVED)
      );
    });

    it('rejects marking already PAID statement', async () => {
      payStatementModel.findById.mockResolvedValue({
        status: PayStatementStatus.PAID,
      });

      await expect(service.markPaid(statementId.toString(), {}, accountantActor._id)).rejects.toThrow(
        new ConflictException(PayrollErrors.STATEMENT_ALREADY_PAID)
      );
    });
  });

  describe('findStatements', () => {
    it('allows staff to view all statements with filters', async () => {
      payStatementModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: statementId }]),
      });

      const result = await service.findStatements(orgId.toString(), { month: '2026-10' }, accountantActor);

      expect(result).toHaveLength(1);
      expect(payStatementModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          month: '2026-10',
        })
      );
    });

    it('restricts instructor to own approved/paid statements', async () => {
      payStatementModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ _id: statementId }]),
      });

      await service.findStatements(orgId.toString(), {}, instructorActor);

      expect(payStatementModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          teacherId: new Types.ObjectId(instructorActor._id),
          status: { $in: [PayStatementStatus.APPROVED, PayStatementStatus.PAID] },
        })
      );
    });
  });

  describe('getStatementById', () => {
    it('returns statement for staff', async () => {
      const statement = { _id: statementId, organizationId: orgId };
      payStatementModel.findById.mockResolvedValue(statement);

      const result = await service.getStatementById(statementId.toString(), accountantActor);
      expect(result).toBe(statement);
    });

    it('rejects instructor if statement is DRAFT', async () => {
      payStatementModel.findById.mockResolvedValue({
        _id: statementId,
        organizationId: orgId,
        teacherId: new Types.ObjectId(instructorActor._id),
        status: PayStatementStatus.DRAFT,
      });

      await expect(service.getStatementById(statementId.toString(), instructorActor)).rejects.toThrow(
        new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND)
      );
    });

    it('rejects instructor if statement is for another teacher', async () => {
      payStatementModel.findById.mockResolvedValue({
        _id: statementId,
        organizationId: orgId,
        teacherId: new Types.ObjectId(),
        status: PayStatementStatus.APPROVED,
      });

      await expect(service.getStatementById(statementId.toString(), instructorActor)).rejects.toThrow(
        new NotFoundException(PayrollErrors.STATEMENT_NOT_FOUND)
      );
    });
  });
});
