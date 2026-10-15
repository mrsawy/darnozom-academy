/**
 * Formats a certificate serial number according to:
 * {ORG_SHORT}-{YYYY}-{000001}
 *
 * @param shortCode Organization short code (3-6 chars, fallback to 'ACAD')
 * @param year 4-digit calendar year
 * @param sequence Integer sequence number (starts at 1)
 */
export function formatCertificateSerial(
  shortCode: string | undefined | null,
  year: number | string,
  sequence: number,
): string {
  const cleanCode = (shortCode || 'ACAD')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'ACAD';

  const paddedSequence = Math.max(1, Math.floor(sequence))
    .toString()
    .padStart(6, '0');

  return `${cleanCode}-${year}-${paddedSequence}`;
}
