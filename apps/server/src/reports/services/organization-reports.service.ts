import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model } from 'mongoose';
import type { OrganizationDashboardReports } from '@lms-organization/shared-types';
import { PaymentPurpose } from '@lms-organization/shared-types';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { Transaction, TransactionStatus } from 'src/transaction/entities/transaction.entity';
import { GetOrganizationReportsDto } from '../dto/get-organization-reports.dto';
import { ReportsAggregationService } from './reports-aggregation.service';

@Injectable()
export class OrganizationReportsService {
  constructor(
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<Enrollment>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly reportsAggregation: ReportsAggregationService
  ) {}

  async getDashboard(organizationId: mongoose.Types.ObjectId, dto: GetOrganizationReportsDto): Promise<OrganizationDashboardReports> {
    const enrollmentMatch = this.buildEnrollmentMatch(organizationId, dto);
    const transactionMatch = this.buildTransactionMatch(organizationId, dto);

    const [enrollments, transactions] = await Promise.all([
      this.enrollmentModel.find(enrollmentMatch).lean().exec(),
      this.transactionModel.find(transactionMatch).select('courseId netAmount createdAt').lean().exec(),
    ]);

    const { totalRevenue, revenueByCourseId } = this.summarizeTransactions(
      transactions as { courseId?: mongoose.Types.ObjectId; netAmount?: number }[]
    );

    return this.reportsAggregation.aggregateOrganizationDashboard(enrollments as unknown as Enrollment[], {
      totalRevenue,
      revenueByCourseId,
      transactions: transactions as { createdAt?: Date; netAmount?: number }[],
      activeLearnersDateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
    });
  }

  private buildEnrollmentMatch(organizationId: mongoose.Types.ObjectId, dto: GetOrganizationReportsDto): FilterQuery<Enrollment> {
    const match: FilterQuery<Enrollment> = {
      organizationId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };
    if (dto.dateFrom || dto.dateTo) {
      match.enrolledAt = {};
      if (dto.dateFrom) {
        (match.enrolledAt as mongoose.FilterQuery<Date>).$gte = new Date(dto.dateFrom);
      }
      if (dto.dateTo) {
        (match.enrolledAt as mongoose.FilterQuery<Date>).$lte = new Date(dto.dateTo);
      }
    }
    if (dto.accessTypes?.length) {
      match.accessType = { $in: dto.accessTypes };
    }
    if (dto.courseIds?.length) {
      match.courseId = { $in: dto.courseIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    return match;
  }

  private buildTransactionMatch(organizationId: mongoose.Types.ObjectId, dto: GetOrganizationReportsDto): FilterQuery<Transaction> {
    const match: FilterQuery<Transaction> = {
      toOrganizationId: organizationId,
      status: TransactionStatus.COMPLETED,
      purpose: PaymentPurpose.COURSE_PURCHASE,
    };
    if (dto.dateFrom || dto.dateTo) {
      match.createdAt = {};
      if (dto.dateFrom) {
        (match.createdAt as mongoose.FilterQuery<Date>).$gte = new Date(dto.dateFrom);
      }
      if (dto.dateTo) {
        (match.createdAt as mongoose.FilterQuery<Date>).$lte = new Date(dto.dateTo);
      }
    }
    if (dto.courseIds?.length) {
      match.courseId = { $in: dto.courseIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    return match;
  }

  private summarizeTransactions(transactions: { courseId?: mongoose.Types.ObjectId; netAmount?: number }[]) {
    const revenueByCourseId = new Map<string, number>();
    let totalRevenue = 0;
    for (const t of transactions) {
      const amt = typeof t.netAmount === 'number' && !Number.isNaN(t.netAmount) ? t.netAmount : 0;
      totalRevenue += amt;
      if (t.courseId) {
        const cid = t.courseId.toString();
        revenueByCourseId.set(cid, (revenueByCourseId.get(cid) ?? 0) + amt);
      }
    }
    return { totalRevenue, revenueByCourseId };
  }
}
