import { forwardRef, Module } from '@nestjs/common';
import { EnrollmentService } from './services/enrollment.service';
import { EnrollmentHttpController } from './controllers/enrollment.http.controller';
import { CourseModule } from 'src/course/course.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Enrollment, EnrollmentSchema } from './entities/enrollment.entity';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { UserModule } from 'src/user/user.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { EnrollmentMessageController } from './controllers/enrollment.message.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PaymentModule } from 'src/payment/payment.module';
import { CurrencyModule } from 'src/currency/currency.module';
import { RoleModule } from 'src/role/role.module';
import { EnrollmentProgressService } from './services/enrollment.progress.service';
import { EnrollmentProgressController } from './controllers/enrollment.progress.controller';
import { ActiveEnrollmentGuard } from './guards/active-enrollment.guard';
import { NotificationModule } from 'src/notification/notification.module';
import { FileModule } from 'src/file/file.module';
import { OrganizationModule } from 'src/organization/organization.module';
import { ReviewModule } from 'src/review/review.module';
import { CoursePayment, CoursePaymentSchema } from './entities/course-payment.entity';
import { PaymentMethodConfig, PaymentMethodConfigSchema } from 'src/billing/entities/payment-method-config.entity';
import { CoursePaymentService } from './services/course-payment.service';
import { CoursePaymentMessageController } from './controllers/course-payment.message.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: User.name, schema: UserSchema },
      { name: CoursePayment.name, schema: CoursePaymentSchema },
      { name: PaymentMethodConfig.name, schema: PaymentMethodConfigSchema },
    ]),
    forwardRef(() => WalletModule),
    forwardRef(() => CourseModule),
    ReviewModule,
    OrganizationModule,
    UserModule,
    CurrencyModule,
    PaymentModule,
    AuthModule,
    RoleModule,
    NotificationModule,
    FileModule,
  ],
  controllers: [EnrollmentHttpController, EnrollmentMessageController, EnrollmentProgressController, CoursePaymentMessageController],
  providers: [EnrollmentService, EnrollmentProgressService, ActiveEnrollmentGuard, CoursePaymentService],
  exports: [EnrollmentService, EnrollmentProgressService, ActiveEnrollmentGuard],
})
export class EnrollmentModule {}
