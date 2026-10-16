import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { configDotenv } from 'dotenv';
configDotenv();
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationModule } from './organization/organization.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { CategoryModule } from './category/category.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { FileModule } from './file/file.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlanModule } from './plan/plan.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
// import { PaymentModule } from './payment/payment.module'; // Unused import
import { WalletModule } from './wallet/wallet.module';
import { OptionsModule } from './options/options.module';
import { CurrencyModule } from './currency/currency.module';
import { ReviewModule } from './review/review.module';
import { TransactionModule } from './transaction/transaction.module';
import { PageModule } from './page/page.module';
import { GalleryModule } from './gallery/gallery.module';
import { AttendanceModule } from './attendance/attendance.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { DatabaseModule } from './database/database.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { NotificationModule } from './notification/notification.module';
import { AdminReviewModule } from './admin-review/admin-review.module';
import { VerificationModule } from './verification/verification.module';
import { RateLimiterModule } from './rate-limiter';
import { WithdrawalRequestModule } from './withdrawal-request/withdrawal-request.module';
import { PrivateSessionModule } from './private-session/private-session.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ChatModule } from './chat/chat.module';
import { AiModule } from './ai/ai.module';
import { AiPlanModule } from './ai-plan/ai-plan.module';
import { AiSubscriptionModule } from './ai-subscription/ai-subscription.module';
import { TranscriptionModule } from './transcription/transcription.module';
import { ReportsModule } from './reports/reports.module';
import { AgoraModule } from './agora/agora.module';
import { GradeModule } from './grade/grade.module';
import { AcademicsModule } from './academics/academics.module';
import { SchoolTypeModule } from './school-type/school-type.module';
import { BillingModule } from './billing/billing.module';
import { PayrollModule } from './payroll/payroll.module';
import { CertificateModule } from './certificate/certificate.module';
import { MessageTemplateModule } from './message-template/message-template.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorHandlerInterceptor } from './utils/interceptors/errorHandler.interceptor';
import { OnboardingGuard } from './auth/guards/onboarding.guard';
import { validateEnv } from './config/env.validation';
import { getMongoUri, MONGO_CONNECTION_OPTIONS } from './config/mongo.config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: getMongoUri(),
        ...MONGO_CONNECTION_OPTIONS,
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6380' },
      }),
    }),
    EventEmitterModule.forRoot(),
    // RedisModule.forRoot({
    //   config: {
    //     url: process.env.NODE_ENV === 'DEVELOPMENT' ? process.env.REDIS_URL_DEV : process.env.REDIS_URL_PROD,
    //   },
    // }),

    DatabaseModule,
    WalletModule,
    OrganizationModule,
    UserModule,
    CourseModule,
    CategoryModule,
    RoleModule,
    AuthModule,
    FileModule,
    EnrollmentModule,
    PlanModule,
    SubscriptionModule,
    NotificationModule,
    // PaymentModule,
    OptionsModule,
    CurrencyModule,
    ReviewModule,
    TransactionModule,
    PageModule,
    GalleryModule,
    AttendanceModule,
    WishlistModule,
    AdminReviewModule,
    VerificationModule,
    RateLimiterModule,
    WithdrawalRequestModule,
    PrivateSessionModule,
    RealtimeModule,
    ChatModule,
    AiModule,
    AiPlanModule,
    AiSubscriptionModule,
    TranscriptionModule,
    ReportsModule,
    AgoraModule,
    GradeModule,
    AcademicsModule,
    SchoolTypeModule,
    BillingModule,
    PayrollModule,
    CertificateModule,
    MessageTemplateModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorHandlerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: OnboardingGuard,
    },
  ],
})
export class AppModule {}
