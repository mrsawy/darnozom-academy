import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Course, CourseSchema } from 'src/course/entities/course.entity';
import { Enrollment, EnrollmentSchema } from 'src/enrollment/entities/enrollment.entity';
import { Transaction, TransactionSchema } from 'src/transaction/entities/transaction.entity';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { ReportsAggregationService } from './services/reports-aggregation.service';
import { StudentReportsService } from './services/student-reports.service';
import { OrganizationReportsService } from './services/organization-reports.service';
import { InstructorReportsService } from './services/instructor-reports.service';
import { OrganizationMemberReportsService } from './services/organization-member-reports.service';
import { ReportsStudentControllerMessage } from './controllers/message/reports-student.controller.message';
import { ReportsOrganizationControllerMessage } from './controllers/message/reports-organization.controller.message';
import { ReportsOrganizationMemberControllerMessage } from './controllers/message/reports-organization-member.controller.message';
import { ReportsInstructorControllerMessage } from './controllers/message/reports-instructor.controller.message';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    AuthModule,
    RoleModule,
  ],
  controllers: [
    ReportsStudentControllerMessage,
    ReportsOrganizationControllerMessage,
    ReportsOrganizationMemberControllerMessage,
    ReportsInstructorControllerMessage,
  ],
  providers: [
    ReportsAggregationService,
    StudentReportsService,
    OrganizationReportsService,
    OrganizationMemberReportsService,
    InstructorReportsService,
  ],
  exports: [ReportsAggregationService, StudentReportsService, OrganizationReportsService, OrganizationMemberReportsService, InstructorReportsService],
})
export class ReportsModule {}
