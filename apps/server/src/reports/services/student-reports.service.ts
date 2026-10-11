import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model } from 'mongoose';
import type { StudentDashboardReports } from '@lms-organization/shared-types';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { GetStudentReportsDto } from '../dto/get-student-reports.dto';
import { ReportsAggregationService } from './reports-aggregation.service';

@Injectable()
export class StudentReportsService {
  constructor(
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: Model<Enrollment>,
    private readonly reportsAggregation: ReportsAggregationService
  ) {}

  async getDashboard(studentId: mongoose.Types.ObjectId, dto: GetStudentReportsDto): Promise<StudentDashboardReports> {
    const match: FilterQuery<Enrollment> = {
      userId: studentId,
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
    const enrollments = await this.enrollmentModel.find(match).lean().exec();
    return this.reportsAggregation.aggregateStudentDashboard(enrollments as unknown as Enrollment[]);
  }
}
