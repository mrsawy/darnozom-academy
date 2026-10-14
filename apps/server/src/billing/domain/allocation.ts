import { Currency } from '@darnozom/shared-types';

export interface OpenCharge {
  chargeLedgerEntryId: string;
  currency: Currency;
  /** Null sorts last: a charge with no due date waits behind every dated one. */
  dueAt: Date | null;
  createdAt: Date;
  amountMinor: number;
  alreadyAllocatedMinor: number;
}

export interface PlannedAllocation {
  chargeLedgerEntryId: string;
  amountMinor: number;
}

export interface AllocationResult {
  allocations: PlannedAllocation[];
  /** Money the payment could not settle. It stays on the ledger as a credit, never discarded. */
  unallocatedMinor: number;
}

export function outstandingOf(charge: OpenCharge): number {
  return Math.max(0, charge.amountMinor - charge.alreadyAllocatedMinor);
}

const DISTANT_FUTURE = Number.MAX_SAFE_INTEGER;
const dueKey = (charge: OpenCharge): number => charge.dueAt?.getTime() ?? DISTANT_FUTURE;

/**
 * Settles a payment against the family's open charges, oldest due first, within one currency.
 *
 * A payment in one currency can never settle a charge in another: there is no exchange rate in the
 * MVP, and inventing one would silently misstate what a family owes. Whatever is left over comes
 * back as `unallocatedMinor` and remains a credit on the ledger.
 */
export function allocateFifo(paymentAmountMinor: number, paymentCurrency: Currency, charges: OpenCharge[]): AllocationResult {
  if (paymentAmountMinor <= 0) return { allocations: [], unallocatedMinor: 0 };

  const eligible = charges
    .filter((charge) => charge.currency === paymentCurrency && outstandingOf(charge) > 0)
    .toSorted((a, b) => dueKey(a) - dueKey(b) || a.createdAt.getTime() - b.createdAt.getTime());

  const allocations: PlannedAllocation[] = [];
  let remaining = paymentAmountMinor;

  for (const charge of eligible) {
    if (remaining <= 0) break;
    const amountMinor = Math.min(remaining, outstandingOf(charge));
    // Integer minor units throughout, so this comparison never leaves a stray fraction behind.
    allocations.push({ chargeLedgerEntryId: charge.chargeLedgerEntryId, amountMinor });
    remaining -= amountMinor;
  }

  return { allocations, unallocatedMinor: remaining };
}
