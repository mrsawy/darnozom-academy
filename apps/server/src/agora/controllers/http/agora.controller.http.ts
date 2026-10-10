import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { AgoraService } from '../../agora.service';
import { IssueLiveSessionTokenDto } from '../../dto/issue-live-session-token.dto';
import { IssuePrivateSessionTokenDto } from '../../dto/issue-private-session-token.dto';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { SkipRateLimit } from 'src/rate-limiter/rate-limiter.decorator';

@Controller('agora')
export class AgoraControllerHttp {
  constructor(private readonly agoraService: AgoraService) {}

  @Post('token/live-session')
  @UseGuards(AuthGuard)
  @SkipRateLimit()
  liveSessionToken(@Body() dto: IssueLiveSessionTokenDto, @Request() req: IUserRequest) {
    return this.agoraService.issueLiveSessionToken(req.user, dto);
  }

  @Post('token/private-session')
  @UseGuards(AuthGuard)
  @SkipRateLimit()
  privateSessionToken(@Body() dto: IssuePrivateSessionTokenDto, @Request() req: IUserRequest) {
    return this.agoraService.issuePrivateSessionToken(req.user._id.toString(), dto);
  }
}
