import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CertificateStatus, FinalResult } from '@darnozom/shared-types';
import * as certAction from './certificate.action';

vi.mock('@/lib/utils/createNatsRequest', () => ({
  createAuthorizedNatsRequest: vi.fn(),
  createNatsRequest: vi.fn(),
}));

import { createAuthorizedNatsRequest, createNatsRequest } from '@/lib/utils/createNatsRequest';

describe('certificate.action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evaluateGroupCertificates calls certificates.evaluate', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue([{ _id: 'c1' }]);
    const result = await certAction.evaluateGroupCertificates('g1');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('certificates.evaluate', { id: 'g1' });
    expect(result).toEqual([{ _id: 'c1' }]);
  });

  it('getCertificates calls certificates.list', async () => {
    const filter = { groupId: 'g1', status: CertificateStatus.ISSUED };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue([{ _id: 'c1' }]);
    const result = await certAction.getCertificates(filter);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('certificates.list', filter);
    expect(result).toEqual([{ _id: 'c1' }]);
  });

  it('getCertificateById calls certificates.findOne', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 'c1' });
    const result = await certAction.getCertificateById('c1');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('certificates.findOne', { id: 'c1' });
    expect(result).toEqual({ _id: 'c1' });
  });

  it('updateCertificateName calls certificates.updateName', async () => {
    const data = { nameAr: 'أحمد علي', nameEn: 'Ahmad Ali' };
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 'c1', ...data });
    const result = await certAction.updateCertificateName('c1', data);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('certificates.updateName', {
      id: 'c1',
      nameAr: data.nameAr,
      nameEn: data.nameEn,
    });
    expect(result).toEqual({ _id: 'c1', ...data });
  });

  it('confirmCertificateName calls certificates.confirmName', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 'c1' });
    const result = await certAction.confirmCertificateName('c1');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('certificates.confirmName', { id: 'c1' });
    expect(result).toEqual({ _id: 'c1' });
  });

  it('issueCertificate calls certificates.issue', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 'c1', status: CertificateStatus.ISSUED });
    const result = await certAction.issueCertificate('c1');
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('certificates.issue', { id: 'c1' });
    expect(result).toEqual({ _id: 'c1', status: CertificateStatus.ISSUED });
  });

  it('verifyCertificatePublic calls certificates.verifyPublic without auth', async () => {
    vi.mocked(createNatsRequest).mockResolvedValue({
      studentNameAr: 'أحمد',
      studentNameEn: 'Ahmad',
      courseName: 'Quran',
      levelName: 'Level 1',
      organizationName: 'Dar Nozom',
      serial: 'NOZOM-2026-000001',
      issuedAt: new Date(),
    });

    const result = await certAction.verifyCertificatePublic('token-123');
    expect(createNatsRequest).toHaveBeenCalledWith('certificates.verifyPublic', { token: 'token-123' });
    expect(result).toBeDefined();
  });

  it('setStudentFinalResult calls academics.groups.setFinalResult', async () => {
    vi.mocked(createAuthorizedNatsRequest).mockResolvedValue({ _id: 'g1' });
    const result = await certAction.setStudentFinalResult('g1', 's1', FinalResult.PASS);
    expect(createAuthorizedNatsRequest).toHaveBeenCalledWith('academics.groups.setFinalResult', {
      id: 'g1',
      studentId: 's1',
      finalResult: FinalResult.PASS,
    });
    expect(result).toEqual({ _id: 'g1' });
  });
});
