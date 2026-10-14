import { Currency } from '@darnozom/shared-types';

/**
 * Minor units per major unit. Every currency the platform supports is two-decimal, so this is 100
 * throughout; the map exists so a zero-decimal currency can be added without hunting for literals.
 */
const MINOR_UNITS: Partial<Record<Currency, number>> = {};
export const MINOR_UNITS_PER_MAJOR = 100;

export const minorUnitsFor = (currency: Currency): number => MINOR_UNITS[currency] ?? MINOR_UNITS_PER_MAJOR;

/**
 * A major amount as an integer count of minor units.
 *
 * `Math.round` on the scaled value is deliberate: `10.1 * 100` is `1010.0000000000001` in IEEE 754,
 * and truncating would silently lose a piastre on amounts an accountant typed by hand.
 */
export function toMinor(major: number, currency: Currency): number {
  return Math.round((major + Number.EPSILON) * minorUnitsFor(currency));
}

export function toMajor(minor: number, currency: Currency): number {
  return minor / minorUnitsFor(currency);
}

/**
 * A stored amount is always a non-negative integer. Whether it adds to or reduces what a family
 * owes is the `LedgerEntryType`'s job, not a sign hidden in the number — except on an `ADJUSTMENT`,
 * which carries its own explicit `direction`.
 */
export function isValidAmountMinor(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function sumMinor(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
