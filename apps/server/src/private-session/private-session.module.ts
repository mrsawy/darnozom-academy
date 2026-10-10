import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrivateSession, PrivateSessionSchema } from './entities/private-session.entity';
import { SessionBooking, SessionBookingSchema } from './entities/session-booking.entity';
import { PrivateSessionService } from './services/private-session.service';
import { SessionBookingService } from './services/session-booking.service';
import { PrivateSessionControllerMessage } from './controllers/message/private-session.controller.message';
import { PrivateSessionControllerHttp } from './controllers/http/private-session.controller.http';
import { AuthModule } from 'src/auth/auth.module';
import { RoleModule } from 'src/role/role.module';
import { CurrencyModule } from 'src/currency/currency.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { UserModule } from 'src/user/user.module';
import { PaymentModule } from 'src/payment/payment.module';
import { Organization, OrganizationSchema } from 'src/organization/entities/organization.entity';
import { EnrollmentModule } from 'src/enrollment/enrollment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrivateSession.name, schema: PrivateSessionSchema },
      { name: SessionBooking.name, schema: SessionBookingSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
    CurrencyModule,
    forwardRef(() => WalletModule),
    forwardRef(() => UserModule),
    forwardRef(() => PaymentModule),
    forwardRef(() => EnrollmentModule),
  ],
  controllers: [PrivateSessionControllerMessage, PrivateSessionControllerHttp],
  providers: [PrivateSessionService, SessionBookingService],
  exports: [MongooseModule, PrivateSessionService, SessionBookingService],
})
export class PrivateSessionModule {}
