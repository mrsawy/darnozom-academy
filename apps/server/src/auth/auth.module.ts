import { forwardRef, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrganizationModule } from '../organization/organization.module';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';
import { AuthControllerMessage } from './controllers/message/auth.controller.message';
import { AuthGuard } from './guards/auth.guard';
import { RealtimeModule } from '../realtime/realtime.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';
import { PasswordResetToken, PasswordResetTokenSchema } from './entities/password-reset-token.entity';
import { TokenService } from './services/token.service';
import { AuthSessionService } from './services/auth-session.service';
import { OAuthProfileService } from './services/oauth-profile.service';
import { OAuthCodeService } from './services/oauth-code.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuthControllerHttp } from './controllers/http/auth.controller.http';
import session from 'express-session';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JSON_PRIVATE_KEY') ?? '',
        signOptions: {
          expiresIn: (configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') ?? '15m') as SignOptions['expiresIn'],
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
    forwardRef(() => OrganizationModule),
    forwardRef(() => UserModule),
    forwardRef(() => RoleModule),
    RealtimeModule,
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
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000,
          },
        })
      )
      .forRoutes({ path: 'auth/google', method: RequestMethod.GET }, { path: 'auth/google/callback', method: RequestMethod.GET });
  }
}
