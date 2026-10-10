import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeSessionAuthService } from './realtime-session-auth.service';

@Module({
  providers: [RealtimeGateway, RealtimeService, RealtimeSessionAuthService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
