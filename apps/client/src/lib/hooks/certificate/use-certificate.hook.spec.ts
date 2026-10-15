import { describe, expect, it } from 'vitest';
import { CertificateStatus } from '@darnozom/shared-types';
import { certificateKeys } from './use-certificate.hook';

describe('certificateKeys', () => {
  it('namespaces all keys under certificates root so invalidating certificates invalidates everything', () => {
    expect(certificateKeys.all[0]).toBe('certificates');
    expect(certificateKeys.list()[0]).toBe('certificates');
    expect(certificateKeys.detail('c1')[0]).toBe('certificates');
    expect(certificateKeys.verify('tok1')[0]).toBe('certificates');
  });

  it('differentiates list keys by query filters', () => {
    expect(certificateKeys.list({ groupId: 'g1' })).toEqual([
      'certificates',
      'list',
      { groupId: 'g1' },
    ]);
    expect(certificateKeys.list({ status: CertificateStatus.ISSUED })).not.toEqual(
      certificateKeys.list({ status: CertificateStatus.NAME_REVIEW }),
    );
  });

  it('differentiates detail and verify keys', () => {
    expect(certificateKeys.detail('c1')).toEqual(['certificates', 'detail', 'c1']);
    expect(certificateKeys.verify('tok-1')).toEqual(['certificates', 'verify', 'tok-1']);
  });
});
