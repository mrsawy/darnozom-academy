import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { AgoraService } from '../../agora.service';
import { IssueLiveSessionTokenDto } from '../../dto/issue-live-session-token.dto';
import { IssuePrivateSessionTokenDto } from '../../dto/issue-private-session-token.dto';

@ApplyRpcErrorHandling
@Controller()
export class AgoraControllerMessage {
  constructor(private readonly agoraService: AgoraService) {}

  @UseGuards(AuthGuard)
  @MessagePattern('agora.liveSessionToken')
  liveSessionToken(@Payload(new RpcValidationPipe()) payload: IssueLiveSessionTokenDto, @Ctx() ctx: IUserContext) {
    return this.agoraService.issueLiveSessionToken(ctx.userPayload, payload);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('agora.privateSessionToken')
  privateSessionToken(@Payload(new RpcValidationPipe()) payload: IssuePrivateSessionTokenDto, @Ctx() ctx: IUserContext) {
    return this.agoraService.issuePrivateSessionToken(ctx.userPayload._id.toString(), payload);
  }
}
