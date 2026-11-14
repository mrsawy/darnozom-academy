import { Types } from 'mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Currency, GroupPayModel, GroupStudentStatus, PayStatementStatus, PayrollErrors, Roles } from '@darnozom/shared-types';
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
  let ruleService: { effectiveForMonth: jest.Mock };
  let subscriptionModel: { countDocuments: jest.Mock };
  let sessionModel: { find: jest.Mock };
  let groupModel: { find: jest.Mock };
  let ledgerEntryModel: { find: jest.Mock };
  let allocationModel: { aggregate: jest.Mock };
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
    ruleService = { effectiveForMonth: jest.fn() };
    subscriptionModel = { countDocuments: jest.fn().mockResolvedValue(0) };
    sessionModel = { find: jest.fn() };
    groupModel = { find: jest.fn() };
    ledgerEntryModel = { find: jest.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) }) };
    allocationModel = { aggregate: jest.fn().mockResolvedValue([]) };
    organizationModel = {
      findById: jest.fn().mockResolvedValue({ timezone: 'UTC' }),
    };

    service = new PayrollService(
      payStatementModel as never,
      ruleService as never,
      subscriptionModel as never,
      sessionModel as never,
      groupModel as never,
      ledgerEntryModel as never,
      allocationModel as never,
      organizationModel as never
    );
  });

  describe('generateStatements', () => {
    const groupId = new Types.ObjectId();
    const rule = (over: Record<string, unknown> = {}) => ({
      teacherId,
      groupId,
      model: GroupPayModel.FIXED_PER_GROUP,
      rate: 300,
      currency: Currency.USD,
      ...over,
    });
    const group = { _id: groupId, name: 'Tajweed A', students: [{ studentId: new Types.ObjectId(), status: GroupStudentStatus.ACTIVE }] };

    beforeEach(() => {
      payStatementModel.findOne.mockResolvedValue(null);
      sessionModel.find.mockResolvedValue([]);
      groupModel.find.mockResolvedValue([group]);
      payStatementModel.create.mockImplementation((doc: unknown) => Promise.resolve(doc));
    });

    it('pays a fixed amount per group', async () => {
      ruleService.effectiveForMonth.mockResolvedValue([rule()]);

      const result = await service.generateStatements(orgId.toString(), '2026-10');

      expect(result).toHaveLength(1);
      expect(payStatementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teacherId,
          month: '2026-10',
          baseAmount: 300,
          total: 300,
          currency: Currency.USD,
          status: PayStatementStatus.DRAFT,
          lines: [expect.objectContaining({ groupName: 'Tajweed A', model: GroupPayModel.FIXED_PER_GROUP, amount: 300 })],
        })
      );
    });

    it('pays a fixed amount per active subscription', async () => {
      ruleService.effectiveForMonth.mockResolvedValue([rule({ model: GroupPayModel.FIXED_PER_SUBSCRIPTION, rate: 40 })]);
      subscriptionModel.countDocuments.mockResolvedValue(5);

      await service.generateStatements(orgId.toString(), '2026-10');

      expect(payStatementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ baseAmount: 200, lines: [expect.objectContaining({ subscriptions: 5, amount: 200 })] })
      );
    });

    it('pays a percentage of the subscription money collected in the month', async () => {
      ruleService.effectiveForMonth.mockResolvedValue([rule({ model: GroupPayModel.PERCENT_OF_SUBSCRIPTIONS, rate: 25 })]);
      const chargeId = new Types.ObjectId();
      ledgerEntryModel.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([{ _id: chargeId }]) }) });
      allocationModel.aggregate.mockResolvedValue([{ total: 80_000 }]); // 800.00 collected

      await service.generateStatements(orgId.toString(), '2026-10');

      expect(payStatementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseAmount: 200,
          basis: expect.objectContaining({ revenue: 800 }),
          lines: [expect.objectContaining({ collected: 800, amount: 200 })],
        })
      );
    });

    it('sums one line per group into a single statement for the teacher', async () => {
      const otherGroupId = new Types.ObjectId();
      groupModel.find.mockResolvedValue([group, { _id: otherGroupId, name: 'Hifz B', students: [] }]);
      ruleService.effectiveForMonth.mockResolvedValue([rule(), rule({ groupId: otherGroupId, model: GroupPayModel.FIXED_PER_SUBSCRIPTION, rate: 10 })]);
      subscriptionModel.countDocuments.mockResolvedValue(3);

      await service.generateStatements(orgId.toString(), '2026-10');

      expect(payStatementModel.create).toHaveBeenCalledTimes(1);
      expect(payStatementModel.create).toHaveBeenCalledWith(expect.objectContaining({ baseAmount: 330, total: 330 }));
    });

    it('skips statement if already APPROVED or PAID', async () => {
      ruleService.effectiveForMonth.mockResolvedValue([rule()]);
      payStatementModel.findOne.mockResolvedValue({ status: PayStatementStatus.APPROVED });

      const result = await service.generateStatements(orgId.toString(), '2026-10');

      expect(result).toHaveLength(0);
      expect(payStatementModel.create).not.toHaveBeenCalled();
    });

    it('recalculates existing DRAFT statement preserving bonuses', async () => {
      ruleService.effectiveForMonth.mockResolvedValue([rule({ rate: 1000 })]);
      const existingBonuses = [{ amount: 200, reason: 'Hard work', addedBy: new Types.ObjectId(), addedAt: new Date() }];
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
