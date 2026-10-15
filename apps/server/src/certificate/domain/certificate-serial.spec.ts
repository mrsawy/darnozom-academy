import { formatCertificateSerial } from './certificate-serial';

describe('formatCertificateSerial', () => {
  it('formats serial with 6-digit zero-padded sequence', () => {
    expect(formatCertificateSerial('NOZOM', 2026, 1)).toBe('NOZOM-2026-000001');
    expect(formatCertificateSerial('NOZOM', 2026, 42)).toBe('NOZOM-2026-000042');
    expect(formatCertificateSerial('NOZOM', 2026, 123456)).toBe('NOZOM-2026-123456');
  });

  it('falls back to ACAD if shortCode is empty or invalid', () => {
    expect(formatCertificateSerial('', 2026, 5)).toBe('ACAD-2026-000005');
    expect(formatCertificateSerial(undefined, 2026, 5)).toBe('ACAD-2026-000005');
    expect(formatCertificateSerial(null, 2026, 5)).toBe('ACAD-2026-000005');
    expect(formatCertificateSerial('!!!', 2026, 5)).toBe('ACAD-2026-000005');
  });

  it('normalizes lowercase and removes special characters, truncating to 6 chars', () => {
    expect(formatCertificateSerial('nozom-academy', 2026, 1)).toBe('NOZOMA-2026-000001');
    expect(formatCertificateSerial('dz-1', 2026, 10)).toBe('DZ1-2026-000010');
  });
});
