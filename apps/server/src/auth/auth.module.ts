import { forwardRef, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrganizationModule } from '../organization/organization.module';
import { UserModule } from '../user/user.module';
import { WalletModule } from '../wallet/wallet.module';
import { RoleModule } from '../role/role.module';
import { WishlistModule } from '../wishlist/wishlist.module';
import { AuthControllerMessage } from './controllers/message/auth.controller.message';
import { AuthGuard } from './guards/auth.guard';
import { SubscriptionModule } from '../subscription/subscription.module';
import { NotificationModule } from '../notification/notification.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { PasswordResetToken, PasswordResetTokenSchema } from './entities/password-reset-token.entity';
import { VerificationModule } from '../verification/verification.module';
import { TokenService } from './services/token.service';
import { AuthSessionService } from './services/auth-session.service';
import { OAuthProfileService } from './services/oauth-profile.service';
import { OAuthCodeService } from './services/oauth-code.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuthControllerHttp } from './controllers/http/auth.controller.http';
import session from 'express-session';

const shouldEnableRealtime = process.env.DISABLE_REALTIME !== 'true';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JSON_PRIVATE_KEY') ?? '',
        signOptions: {
          expiresIn: (configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') ??
            '15m') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
    forwardRef(() => OrganizationModule),
    forwardRef(() => UserModule),
    forwardRef(() => WalletModule),
    forwardRef(() => WishlistModule),
    forwardRef(() => SubscriptionModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => VerificationModule),
    forwardRef(() => RoleModule),
    ...(shouldEnableRealtime ? [RealtimeModule] : []),
  ],
  controllers: [AuthControllerHttp, AuthControllerMessage],
  providers: [AuthService, AuthGuard, TokenService, AuthSessionService, OAuthProfileService, OAuthCodeService, GoogleStrategy],
  exports: [AuthService, AuthGuard, TokenService, AuthSessionService],
})
export class AuthModule implements NestModule {
  constructor(private readonly configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        session({
          secret: this.configService.get<string>('SESSION_SECRET') ?? 'oauth-session-secret-change-in-prod',
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: true,
            sameSite: 'none',
            maxAge: 10 * 60 * 1000,
          },
        })
      )
      .forRoutes({ path: 'auth/google', method: RequestMethod.GET }, { path: 'auth/google/callback', method: RequestMethod.GET });
  }
}
