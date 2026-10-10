import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimiterStore } from './rate-limiter.store';
import { RateLimiterGuard } from './rate-limiter.guard';

@Global()
@Module({
  providers: [
    RateLimiterStore,
    {
      provide: APP_GUARD,
      useClass: RateLimiterGuard,
    },
  ],
  exports: [RateLimiterStore],
})
export class RateLimiterModule {}
