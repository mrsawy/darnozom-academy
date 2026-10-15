import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BILLING_REMINDER_INTERVAL_DAYS, Currency, LedgerEntryType, NotificationType } from '@darnozom/shared-types';
import { LedgerEntry } from '../entities/ledger-entry.entity';
import { Allocation } from '../entities/allocation.entity';
import { NotificationService } from 'src/notification/notification.service';

interface OverdueCharge {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  familyId: Types.ObjectId;
  type: LedgerEntryType;
  amountMinor: number;
  currency: Currency;
  dueAt: Date;
}

@Injectable()
export class RemindersService {
  constructor(
    @InjectModel(LedgerEntry.name) private readonly entryModel: Model<LedgerEntry>,
    @InjectModel(Allocation.name) private readonly allocationModel: Model<Allocation>,
    private readonly notifications: NotificationService
  ) {}

  /**
   * One in-app reminder per family per run, on the due date and then every
   * BILLING_REMINDER_INTERVAL_DAYS days until the charges are covered.
   *
   * Per family, not per charge: a family three months behind would otherwise get three
   * notifications a day, which is how people learn to ignore notifications.
   */
  async run(now: Date): Promise<number> {
    const overdue = await this.entryModel
      .find({ type: LedgerEntryType.CHARGE, dueAt: { $ne: null, $lte: now } })
      .lean<OverdueCharge[]>()
      .exec();
    const overdueFiltered = overdue.filter(
      (charge) => charge.type === LedgerEntryType.CHARGE && charge.dueAt && new Date(charge.dueAt).getTime() <= now.getTime()
    );
    if (overdueFiltered.length === 0) return 0;

    const allocated = await this.allocationModel.aggregate<{ _id: Types.ObjectId; total: number }>([
      { $match: { chargeLedgerEntryId: { $in: overdueFiltered.map((charge) => charge._id) } } },
      { $group: { _id: '$chargeLedgerEntryId', total: { $sum: '$amountMinor' } } },
    ]);
    const byCharge = new Map(allocated.map((row) => [String(row._id), row.total]));

    const families = new Map<string, { organizationId: string; outstandingMinor: number; currency: Currency }>();
    for (const charge of overdueFiltered) {
      const outstanding = charge.amountMinor - (byCharge.get(String(charge._id)) ?? 0);
      if (outstanding <= 0) continue;
      const key = String(charge.familyId);
      const current = families.get(key) ?? {
        organizationId: String(charge.organizationId),
        outstandingMinor: 0,
        currency: charge.currency,
      };
      current.outstandingMinor += outstanding;
      families.set(key, current);
    }

    let sent = 0;
    for (const [familyId, summary] of families) {
      if (!(await this.isDue(familyId, now))) continue;
      await this.notifications.create({
        userId: familyId,
        titleKey: 'billingReminderTitle',
        bodyKey: 'billingReminderBody',
        params: { amount: String(summary.outstandingMinor), currency: summary.currency },
        type: NotificationType.INFO,
      });
      sent += 1;
    }
    return sent;
  }

  private async isDue(familyId: string, now: Date): Promise<boolean> {
    // eslint-disable-next-line unicorn/no-array-method-this-argument -- NotificationService.findLast, not Array#findLast
    const last = await this.notifications.findLast(familyId, 'billingReminderTitle');
    if (!last?.createdAt) return true;
    return now.getTime() - last.createdAt.getTime() >= BILLING_REMINDER_INTERVAL_DAYS * 24 * 3600 * 1000;
  }
}
