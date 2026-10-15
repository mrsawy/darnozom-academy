'use server';

import { createAuthorizedNatsRequest, createNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  GetCertificatesFilterDto,
  ICertificate,
  PublicCertificateVerification,
  UpdateCertificateNameDto,
  FinalResult,
} from '@/lib/types/certificate/certificate';

export async function evaluateGroupCertificates(groupId: string) {
  return createAuthorizedNatsRequest<ICertificate[]>('certificates.evaluate', { id: groupId });
}

export async function getCertificates(filter: GetCertificatesFilterDto = {}) {
  return createAuthorizedNatsRequest<ICertificate[]>('certificates.list', filter);
}

export async function getCertificateById(id: string) {
  return createAuthorizedNatsRequest<ICertificate>('certificates.findOne', { id });
}

export async function updateCertificateName(id: string, data: UpdateCertificateNameDto) {
  return createAuthorizedNatsRequest<ICertificate>('certificates.updateName', {
    id,
    nameAr: data.nameAr,
    nameEn: data.nameEn,
  });
}

export async function confirmCertificateName(id: string) {
  return createAuthorizedNatsRequest<ICertificate>('certificates.confirmName', { id });
}

export async function issueCertificate(id: string) {
  return createAuthorizedNatsRequest<ICertificate>('certificates.issue', { id });
}

export async function verifyCertificatePublic(token: string) {
  return createNatsRequest<PublicCertificateVerification>('certificates.verifyPublic', { token });
}

export async function setStudentFinalResult(groupId: string, studentId: string, finalResult: FinalResult) {
  return createAuthorizedNatsRequest('academics.groups.setFinalResult', {
    id: groupId,
    studentId,
    finalResult,
  });
}
