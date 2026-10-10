import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from 'src/organization/entities/organization.entity';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { Otp, OtpSchema } from './entities/otp.entity';
import { EmailService } from './services/email.service';
import { OtpService } from './services/otp.service';
import { VerificationService } from './services/verification.service';
import { VerificationControllerMessage } from './controllers/message/verification.controller.message';
import { RoleModule } from 'src/role/role.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => AuthModule),
    RoleModule,
  ],
  controllers: [VerificationControllerMessage],
  providers: [EmailService, OtpService, VerificationService],
  exports: [VerificationService, EmailService],
})
export class VerificationModule {}
