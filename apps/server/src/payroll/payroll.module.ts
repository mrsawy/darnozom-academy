import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeacherPayProfile, TeacherPayProfileSchema } from './entities/teacher-pay-profile.entity';
import { PayStatement, PayStatementSchema } from './entities/pay-statement.entity';
import { Session, SessionSchema } from '../academics/session/entities/session.entity';
import { Group, GroupSchema } from '../academics/group/entities/group.entity';
import { LedgerEntry, LedgerEntrySchema } from '../billing/entities/ledger-entry.entity';
import { Allocation, AllocationSchema } from '../billing/entities/allocation.entity';
import { Organization, OrganizationSchema } from '../organization/entities/organization.entity';
import { TeacherPayProfileService } from './services/teacher-pay-profile.service';
import { PayrollService } from './services/payroll.service';
import { SessionDisputeService } from './services/session-dispute.service';
import { PayrollControllerMessage } from './payroll.controller.message';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeacherPayProfile.name, schema: TeacherPayProfileSchema },
      { name: PayStatement.name, schema: PayStatementSchema },
      { name: Session.name, schema: SessionSchema },
      { name: Group.name, schema: GroupSchema },
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
      { name: Allocation.name, schema: AllocationSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  providers: [TeacherPayProfileService, PayrollService, SessionDisputeService],
  controllers: [PayrollControllerMessage],
  exports: [MongooseModule, TeacherPayProfileService, PayrollService, SessionDisputeService],
})
export class PayrollModule {}
