import { DateTime } from 'luxon';
import { SubscriptionType } from '@darnozom/shared-types';

export interface PlannedCharge {
  amountMinor: number;
  dueAt: Date;
  /** Null on a FAMILY charge: no single child owns it. */
  studentId: string | null;
  groupId: string | null;
  idempotencyKey: string | null;
  /** A translation key the client renders; the server never stores final English. */
  descriptionKey: string;
}

export interface ScheduleItem {
  studentId: string;
  groupId: string;
  /** The cohort's start date for that item's group. */
  startDate: Date;
}

export interface ScheduleInput {
  subscriptionId: string;
  type: SubscriptionType;
  amountMinor: number;
  items: ScheduleItem[];
}

export const monthlyIdempotencyKey = (subscriptionId: string, dueAt: Date): string => `monthly:${subscriptionId}:${dueAt.toISOString()}`;

export const perSessionIdempotencyKey = (subscriptionId: string, sessionId: string, studentId: string): string =>
  `session:${subscriptionId}:${sessionId}:${studentId}`;

const earliest = (items: ScheduleItem[]): ScheduleItem => {
  let best = items[0];
  for (let i = 1; i < items.length; i++) {
    if (items[i].startDate.getTime() < best.startDate.getTime()) {
      best = items[i];
    }
  }
  return best;
};

/**
 * The charges a subscription posts the moment it is created.
 *
 * A zero amount posts nothing at all. A full scholarship owes nothing, and a zero-amount row would
 * be a charge nobody can pay that every coverage test then has to special-case.
 */
export function initialCharges(input: ScheduleInput): PlannedCharge[] {
  if (input.amountMinor <= 0 || input.items.length === 0) return [];

  switch (input.type) {
    case SubscriptionType.PER_SESSION: {
      // Nothing up front; a charge arrives each time a session completes.
      return [];
    }

    case SubscriptionType.FAMILY: {
      const first = earliest(input.items);
      return [
        {
          amountMinor: input.amountMinor,
          dueAt: first.startDate,
          studentId: null,
          // The earliest-starting group, so sub-project 7 can trace the money (plan decision D5).
          groupId: first.groupId,
          idempotencyKey: `family:${input.subscriptionId}`,
          descriptionKey: 'billing.charge.family',
        },
      ];
    }

    case SubscriptionType.MONTHLY: {
      const item = input.items[0];
      return [
        {
          amountMinor: input.amountMinor,
          dueAt: item.startDate,
          studentId: item.studentId,
          groupId: item.groupId,
          idempotencyKey: monthlyIdempotencyKey(input.subscriptionId, item.startDate),
          descriptionKey: 'billing.charge.monthly',
        },
      ];
    }

    case SubscriptionType.SCHOLARSHIP: {
      const item = input.items[0];
      return [
        {
          amountMinor: input.amountMinor,
          dueAt: item.startDate,
          studentId: item.studentId,
          groupId: item.groupId,
          idempotencyKey: `initial:${input.subscriptionId}`,
          descriptionKey: 'billing.charge.scholarship',
        },
      ];
    }

    case SubscriptionType.FULL_COURSE: {
      const item = input.items[0];
      return [
        {
          amountMinor: input.amountMinor,
          dueAt: item.startDate,
          studentId: item.studentId,
          groupId: item.groupId,
          idempotencyKey: `initial:${input.subscriptionId}`,
          descriptionKey: 'billing.charge.fullCourse',
        },
      ];
    }

    default: {
      return [];
    }
  }
}

/**
 * The 1st of every month after the start month, in the group's timezone, whose moment has arrived.
 * The first month's charge is posted at creation, so it is not repeated here.
 */
export function monthlyChargeDueDates(startDate: Date, timezone: string, now: Date): Date[] {
  const start = DateTime.fromObject(
    { year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() + 1, day: startDate.getUTCDate() },
    { zone: timezone }
  );
  if (!start.isValid) return [];

  const dues: Date[] = [];
  let cursor = start.startOf('month').plus({ months: 1 });
  // A long-running group is bounded by `now`, so this terminates in at most a few dozen steps.
  while (cursor.toMillis() <= now.getTime()) {
    dues.push(cursor.toUTC().toJSDate());
    cursor = cursor.plus({ months: 1 });
  }
  return dues;
}
