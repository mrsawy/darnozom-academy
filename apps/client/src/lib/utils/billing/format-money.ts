import { Currency } from '@darnozom/shared-types';

const MINOR_UNITS_PER_MAJOR = 100;

/** The server works in integer minor units; the client is the only place money is formatted. */
export function formatMoney(amountMinor: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    amountMinor / MINOR_UNITS_PER_MAJOR
  );
}

/**
 * A typed amount as integer minor units, or null when it is not a readable non-negative amount.
 * Null rather than 0, so a form can tell "nothing typed" from "zero typed" — the difference
 * between an incomplete form and a full scholarship.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replaceAll(',', '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * MINOR_UNITS_PER_MAJOR);
}
