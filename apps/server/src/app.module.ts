import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { configDotenv } from 'dotenv';
configDotenv();
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationModule } from './organization/organization.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RealtimeModule } from './realtime/realtime.module';
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
    EventEmitterModule.forRoot(),

    DatabaseModule,
    OrganizationModule,
    UserModule,
    RoleModule,
    AuthModule,
    RealtimeModule,
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
