import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Currency, PayStatementStatus, TeacherPayModel } from '@darnozom/shared-types';
import * as payrollAction from './payroll.action';

vi.mock('@/lib/utils/createNatsRequest', () => ({
  createAuthorizedNatsRequest: vi.fn(),
}));

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

describe('payroll.action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTeacherPayProfile calls payroll.profiles.get', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 'p1' });
    const result = await payrollAction.getTeacherPayProfile('t1');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('payroll.profiles.get', { teacherId: 't1' });
    expect(result).toEqual({ _id: 'p1' });
  });

  it('listTeacherPayProfiles calls payroll.profiles.list', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue([{ _id: 'p1' }]);
    const result = await payrollAction.listTeacherPayProfiles();
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('payroll.profiles.list', {});
    expect(result).toEqual([{ _id: 'p1' }]);
  });

  it('upsertTeacherPayProfile calls payroll.profiles.upsert', async () => {
    const input = {
      teacherId: 't1',
      model: TeacherPayModel.PER_SESSION,
      rate: 75,
      currency: Currency.SAR,
    };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 'p1' });
    const result = await payrollAction.upsertTeacherPayProfile(input);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('payroll.profiles.upsert', input);
    expect(result).toEqual({ _id: 'p1' });
  });

  it('generatePayStatements calls payroll.statements.generate', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue([{ _id: 's1' }]);
    const result = await payrollAction.generatePayStatements('2026-10');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('payroll.statements.generate', { month: '2026-10' });
    expect(result).toEqual([{ _id: 's1' }]);
  });

  it('findPayStatements calls payroll.statements.find', async () => {
    const query = { month: '2026-10', status: PayStatementStatus.APPROVED };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue([{ _id: 's1' }]);
    const result = await payrollAction.findPayStatements(query);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('payroll.statements.find', query);
    expect(result).toEqual([{ _id: 's1' }]);
  });

  it('getPayStatementById calls payroll.statements.getById', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 's1' });
    const result = await payrollAction.getPayStatementById('s1');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('payroll.statements.getById', { id: 's1' });
    expect(result).toEqual({ _id: 's1' });
  });

  it('addBonusToStatement calls payroll.statements.addBonus', async () => {
    const input = { id: 's1', amount: 150, reason: 'Great work' };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 's1' });
    const result = await payrollAction.addBonusToStatement(input);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('payroll.statements.addBonus', input);
    expect(result).toEqual({ _id: 's1' });
  });

  it('approvePayStatement calls payroll.statements.approve', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 's1' });
    const result = await payrollAction.approvePayStatement('s1');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('payroll.statements.approve', { id: 's1' });
    expect(result).toEqual({ _id: 's1' });
  });

  it('markPayStatementPaid calls payroll.statements.markPaid', async () => {
    const input = { id: 's1', paymentReference: 'REF-001' };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 's1' });
    const result = await payrollAction.markPayStatementPaid(input);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('payroll.statements.markPaid', input);
    expect(result).toEqual({ _id: 's1' });
  });

  it('disputeSession calls academics.sessions.dispute', async () => {
    const input = { sessionId: 'sess-1', reason: 'Teacher absent' };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 'sess-1', disputed: true });
    const result = await payrollAction.disputeSession(input);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('academics.sessions.dispute', input);
    expect(result).toEqual({ _id: 'sess-1', disputed: true });
  });

  it('resolveDispute calls academics.sessions.resolveDispute', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 'sess-1', disputed: false });
    const result = await payrollAction.resolveDispute('sess-1');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('academics.sessions.resolveDispute', { sessionId: 'sess-1' });
    expect(result).toEqual({ _id: 'sess-1', disputed: false });
  });
});
