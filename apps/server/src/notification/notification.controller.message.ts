import { Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { NotificationService } from './notification.service';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';

@Controller()
@ApplyRpcErrorHandling
export class NotificationControllerMessage {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthGuard)
  @MessagePattern('notifications.getForUser')
  async getForUser(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { page?: number; limit?: number; unreadOnly?: boolean }
  ) {
    return await this.notificationService.getForUser(context.userPayload._id.toString(), payload);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('notifications.getUnreadCount')
  async getUnreadCount(@Ctx() context: IUserContext) {
    return await this.notificationService.getUnreadCount(context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('notifications.markAsRead')
  async markAsRead(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { notificationId: string }
  ) {
    return await this.notificationService.markAsRead(payload.notificationId, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('notifications.markAllAsRead')
  async markAllAsRead(@Ctx() context: IUserContext) {
    return await this.notificationService.markAllAsRead(context.userPayload._id.toString());
  }
}
