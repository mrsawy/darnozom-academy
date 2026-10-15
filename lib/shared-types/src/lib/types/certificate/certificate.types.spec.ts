import {
  CertificateStatus,
  FinalResult,
} from './certificate.types';
import { CertificateErrors } from '../../messages/certificate-errors.enum';
import { ALL_ERROR_KEYS_SET } from '../../messages/index';
import { Subjects } from '../role/subject/subjects.enum';

describe('certificate shared types', () => {
  it('defines the 3 certificate lifecycle statuses', () => {
    expect(Object.values(CertificateStatus)).toEqual([
      'ELIGIBLE',
      'NAME_REVIEW',
      'ISSUED',
    ]);
  });

  it('defines the 2 final result values', () => {
    expect(Object.values(FinalResult)).toEqual([
      'PASS',
      'FAIL',
    ]);
  });

  it('includes CERTIFICATE subject in Subjects enum', () => {
    expect(Subjects.CERTIFICATE).toBe('CERTIFICATE');
  });

  it('defines certificate error keys and registers them in ALL_ERROR_KEYS_SET', () => {
    expect(CertificateErrors.CERTIFICATE_NOT_FOUND).toBe('CERTIFICATE_NOT_FOUND');
    expect(CertificateErrors.CERTIFICATE_ALREADY_ISSUED).toBe('CERTIFICATE_ALREADY_ISSUED');
    expect(CertificateErrors.CERTIFICATE_NAME_NOT_CONFIRMED).toBe('CERTIFICATE_NAME_NOT_CONFIRMED');
    expect(CertificateErrors.INVALID_VERIFICATION_TOKEN).toBe('INVALID_VERIFICATION_TOKEN');

    for (const errorKey of Object.values(CertificateErrors)) {
      expect(ALL_ERROR_KEYS_SET.has(errorKey)).toBe(true);
    }
  });
});
