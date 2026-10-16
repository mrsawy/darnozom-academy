import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller.message';
import { Group, GroupSchema } from '../academics/group/entities/group.entity';
import { Session, SessionSchema } from '../academics/session/entities/session.entity';
import { Task, TaskSchema } from '../academics/task/entities/task.entity';
import { CourseContent, CourseContentSchema } from '../course/entities/course-content.entity';
import { FamilyPayment, FamilyPaymentSchema } from '../billing/entities/payment.entity';
import { LedgerEntry, LedgerEntrySchema } from '../billing/entities/ledger-entry.entity';
import { PayStatement, PayStatementSchema } from '../payroll/entities/pay-statement.entity';
import { Certificate, CertificateSchema } from '../certificate/entities/certificate.entity';
import { User, UserSchema } from '../user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Task.name, schema: TaskSchema },
      { name: CourseContent.name, schema: CourseContentSchema },
      { name: FamilyPayment.name, schema: FamilyPaymentSchema },
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: PayStatement.name, schema: PayStatementSchema },
      { name: Certificate.name, schema: CertificateSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
