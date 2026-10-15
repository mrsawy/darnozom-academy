import 'reflect-metadata';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { Actions, Currency, PayStatementStatus, Roles, Subjects, TeacherPayModel } from '@darnozom/shared-types';
import { PERMISSIONS_KEY } from 'src/role/permission.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { PayrollControllerMessage } from './payroll.controller.message';
import { TeacherPayProfileService } from './services/teacher-pay-profile.service';
import { PayrollService } from './services/payroll.service';
import { SessionDisputeService } from './services/session-dispute.service';

const proto = PayrollControllerMessage.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;

const expected: [string, string, Actions, Subjects][] = [
  ['getProfile', 'payroll.profiles.get', Actions.READ, Subjects.PAYROLL],
  ['listProfiles', 'payroll.profiles.list', Actions.READ, Subjects.PAYROLL],
  ['upsertProfile', 'payroll.profiles.upsert', Actions.MANAGE, Subjects.PAYROLL],
  ['generateStatements', 'payroll.statements.generate', Actions.MANAGE, Subjects.PAYROLL],
  ['findStatements', 'payroll.statements.find', Actions.READ, Subjects.PAYROLL],
  ['getStatementById', 'payroll.statements.getById', Actions.READ, Subjects.PAYROLL],
  ['addBonus', 'payroll.statements.addBonus', Actions.MANAGE, Subjects.PAYROLL],
  ['approveStatement', 'payroll.statements.approve', Actions.MANAGE, Subjects.PAYROLL],
  ['markPaid', 'payroll.statements.markPaid', Actions.MANAGE, Subjects.PAYROLL],
  ['disputeSession', 'academics.sessions.dispute', Actions.READ, Subjects.SESSION],
  ['resolveDispute', 'academics.sessions.resolveDispute', Actions.READ, Subjects.SESSION],
];

describe('PayrollControllerMessage', () => {
  it.each(expected)('%s answers %s and requires %s %s', (method, pattern, action, subject) => {
    expect(Reflect.getMetadata(PATTERN_METADATA, proto[method])).toEqual([pattern]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, proto[method])).toEqual([{ action, subject }]);
  });

  it('exposes exactly the 11 documented handlers', () => {
    const handlers = Object.getOwnPropertyNames(PayrollControllerMessage.prototype).filter((name) => name !== 'constructor');
    // eslint-disable-next-line unicorn/no-array-sort -- Test assertion comparing sorted arrays
    expect(handlers.sort()).toEqual(expected.map(([method]) => method).sort());
  });

  describe('delegation to services', () => {
    let controller: PayrollControllerMessage;
    let mockProfileService: Partial<Record<keyof TeacherPayProfileService, jest.Mock>>;
    let mockPayrollService: Partial<Record<keyof PayrollService, jest.Mock>>;
    let mockDisputeService: Partial<Record<keyof SessionDisputeService, jest.Mock>>;

    const mockContext = {
      userPayload: {
        _id: 'user-1',
        organizationId: 'org-1',
        roleName: Roles.ACCOUNTANT,
        additionalRoles: [],
      },
    } as unknown as IUserContext;

    beforeEach(() => {
      mockProfileService = {
        getProfileForTeacher: jest.fn().mockResolvedValue({ id: 'p1' }),
        getProfiles: jest.fn().mockResolvedValue([{ id: 'p1' }]),
        upsertProfile: jest.fn().mockResolvedValue({ id: 'p1' }),
      };

      mockPayrollService = {
        generateStatements: jest.fn().mockResolvedValue([{ id: 's1' }]),
        findStatements: jest.fn().mockResolvedValue([{ id: 's1' }]),
        getStatementById: jest.fn().mockResolvedValue({ id: 's1' }),
        addBonus: jest.fn().mockResolvedValue({ id: 's1' }),
        approveStatement: jest.fn().mockResolvedValue({ id: 's1' }),
        markPaid: jest.fn().mockResolvedValue({ id: 's1' }),
      };

      mockDisputeService = {
        disputeSession: jest.fn().mockResolvedValue({ id: 'sess-1', disputed: true }),
        resolveDispute: jest.fn().mockResolvedValue({ id: 'sess-1', disputed: false }),
      };

      controller = new PayrollControllerMessage(
        mockProfileService as unknown as TeacherPayProfileService,
        mockPayrollService as unknown as PayrollService,
        mockDisputeService as unknown as SessionDisputeService
      );
    });

    it('getProfile delegates correctly', async () => {
      const res = await controller.getProfile({ teacherId: 't1' }, mockContext);
      expect(mockProfileService.getProfileForTeacher).toHaveBeenCalledWith('org-1', 't1');
      expect(res).toEqual({ id: 'p1' });
    });

    it('listProfiles delegates correctly', async () => {
      const res = await controller.listProfiles(mockContext);
      expect(mockProfileService.getProfiles).toHaveBeenCalledWith('org-1');
      expect(res).toEqual([{ id: 'p1' }]);
    });

    it('upsertProfile delegates correctly', async () => {
      const payload = {
        teacherId: 't1',
        model: TeacherPayModel.PER_SESSION,
        rate: 50,
        currency: Currency.SAR,
      };
      const res = await controller.upsertProfile(payload, mockContext);
      expect(mockProfileService.upsertProfile).toHaveBeenCalledWith('org-1', 't1', payload);
      expect(res).toEqual({ id: 'p1' });
    });

    it('generateStatements delegates correctly', async () => {
      const res = await controller.generateStatements({ month: '2026-10' }, mockContext);
      expect(mockPayrollService.generateStatements).toHaveBeenCalledWith('org-1', '2026-10');
      expect(res).toEqual([{ id: 's1' }]);
    });

    it('findStatements delegates correctly', async () => {
      const payload = { month: '2026-10', status: PayStatementStatus.APPROVED };
      const res = await controller.findStatements(payload, mockContext);
      expect(mockPayrollService.findStatements).toHaveBeenCalledWith(
        'org-1',
        payload,
        expect.objectContaining({ _id: 'user-1', organizationId: 'org-1' })
      );
      expect(res).toEqual([{ id: 's1' }]);
    });

    it('getStatementById delegates correctly', async () => {
      const res = await controller.getStatementById({ id: 's1' }, mockContext);
      expect(mockPayrollService.getStatementById).toHaveBeenCalledWith('s1', expect.objectContaining({ _id: 'user-1', organizationId: 'org-1' }));
      expect(res).toEqual({ id: 's1' });
    });

    it('addBonus delegates correctly', async () => {
      const payload = { id: 's1', amount: 100, reason: 'Good work' };
      const res = await controller.addBonus(payload, mockContext);
      expect(mockPayrollService.addBonus).toHaveBeenCalledWith('s1', payload, 'user-1');
      expect(res).toEqual({ id: 's1' });
    });

    it('approveStatement delegates correctly', async () => {
      const res = await controller.approveStatement({ id: 's1' }, mockContext);
      expect(mockPayrollService.approveStatement).toHaveBeenCalledWith('s1', 'user-1');
      expect(res).toEqual({ id: 's1' });
    });

    it('markPaid delegates correctly', async () => {
      const payload = { id: 's1', paymentReference: 'REF-123' };
      const res = await controller.markPaid(payload, mockContext);
      expect(mockPayrollService.markPaid).toHaveBeenCalledWith('s1', payload, 'user-1');
      expect(res).toEqual({ id: 's1' });
    });

    it('disputeSession delegates correctly', async () => {
      const payload = { sessionId: 'sess-1', reason: 'Session delayed' };
      const res = await controller.disputeSession(payload, mockContext);
      expect(mockDisputeService.disputeSession).toHaveBeenCalledWith('sess-1', 'Session delayed', expect.objectContaining({ _id: 'user-1' }));
      expect(res).toEqual({ id: 'sess-1', disputed: true });
    });

    it('resolveDispute delegates correctly', async () => {
      const payload = { sessionId: 'sess-1' };
      const res = await controller.resolveDispute(payload, mockContext);
      expect(mockDisputeService.resolveDispute).toHaveBeenCalledWith('sess-1', expect.objectContaining({ _id: 'user-1' }));
      expect(res).toEqual({ id: 'sess-1', disputed: false });
    });
  });
});
