import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model } from 'mongoose';
import type { OrganizationDashboardReports } from '@lms-organization/shared-types';
import { PaymentPurpose } from '@lms-organization/shared-types';
import { Course } from 'src/course/entities/course.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { Transaction, TransactionStatus } from 'src/transaction/entities/transaction.entity';
import { GetInstructorReportsDto } from '../dto/get-instructor-reports.dto';
import { ReportsAggregationService } from './reports-aggregation.service';

@Injectable()
export class InstructorReportsService {
  constructor(
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<Enrollment>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly reportsAggregation: ReportsAggregationService
  ) {}

  /**
   * Aggregates enrollments for courses the user teaches in the organization (primary instructor,
   * co-instructor, or course creator by username).
   */
  async getDashboard(
    instructorUserId: mongoose.Types.ObjectId,
    organizationId: mongoose.Types.ObjectId,
    createdByUsername: string | undefined,
    dto: GetInstructorReportsDto
  ): Promise<OrganizationDashboardReports> {
    const orgMatch: FilterQuery<Course> = { organizationId };

    const roleClauses: FilterQuery<Course>[] = [{ instructorId: instructorUserId }, { coInstructorsIds: instructorUserId }];
    if (createdByUsername) {
      roleClauses.push({ createdBy: createdByUsername });
    }

    const courseFilter: FilterQuery<Course> = {
      ...orgMatch,
      $or: roleClauses,
    };

    const courses = await this.courseModel.find(courseFilter).select('_id').lean().exec();
    let courseIds = courses.map((c) => c._id);

    if (dto.courseIds?.length) {
      const allowed = new Set(dto.courseIds.map((id) => id.toString()));
      courseIds = courseIds.filter((c) => allowed.has(c.toString()));
    }

    const emptyExtras = {
      totalRevenue: 0,
      revenueByCourseId: new Map<string, number>(),
      transactions: [] as { createdAt?: Date; netAmount?: number }[],
      activeLearnersDateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
    };

    if (courseIds.length === 0) {
      return this.reportsAggregation.aggregateOrganizationDashboard([], emptyExtras);
    }

    const enrollmentMatch: FilterQuery<Enrollment> = {
      organizationId,
      courseId: { $in: courseIds },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };
    if (dto.dateFrom || dto.dateTo) {
      enrollmentMatch.enrolledAt = {};
      if (dto.dateFrom) {
        (enrollmentMatch.enrolledAt as mongoose.FilterQuery<Date>).$gte = new Date(dto.dateFrom);
      }
      if (dto.dateTo) {
        (enrollmentMatch.enrolledAt as mongoose.FilterQuery<Date>).$lte = new Date(dto.dateTo);
      }
    }
    if (dto.accessTypes?.length) {
      enrollmentMatch.accessType = { $in: dto.accessTypes };
    }

    const transactionMatch: FilterQuery<Transaction> = {
      toOrganizationId: organizationId,
      status: TransactionStatus.COMPLETED,
      purpose: PaymentPurpose.COURSE_PURCHASE,
      courseId: { $in: courseIds },
    };
    if (dto.dateFrom || dto.dateTo) {
      transactionMatch.createdAt = {};
      if (dto.dateFrom) {
        (transactionMatch.createdAt as mongoose.FilterQuery<Date>).$gte = new Date(dto.dateFrom);
      }
      if (dto.dateTo) {
        (transactionMatch.createdAt as mongoose.FilterQuery<Date>).$lte = new Date(dto.dateTo);
      }
    }

    const [enrollments, transactions] = await Promise.all([
      this.enrollmentModel.find(enrollmentMatch).lean().exec(),
      this.transactionModel.find(transactionMatch).select('courseId netAmount createdAt').lean().exec(),
    ]);

    const revenueByCourseId = new Map<string, number>();
    let totalRevenue = 0;
    for (const t of transactions) {
      const row = t as { courseId?: mongoose.Types.ObjectId; netAmount?: number };
      const amt = typeof row.netAmount === 'number' && !Number.isNaN(row.netAmount) ? row.netAmount : 0;
      totalRevenue += amt;
      if (row.courseId) {
        const cid = row.courseId.toString();
        revenueByCourseId.set(cid, (revenueByCourseId.get(cid) ?? 0) + amt);
      }
    }

    return this.reportsAggregation.aggregateOrganizationDashboard(enrollments as unknown as Enrollment[], {
      totalRevenue,
      revenueByCourseId,
      transactions: transactions as { createdAt?: Date; netAmount?: number }[],
      activeLearnersDateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
    });
  }
}
