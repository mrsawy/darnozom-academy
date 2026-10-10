import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Ctx } from '@nestjs/microservices';
import { DiscussionService } from './discussion.service';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { GetDiscussionsDto } from './dto/get-discussions.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { IUserContext } from '../utils/types/IUserContext.interface';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { Actions, Subjects } from '@lms-organization/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';

@Controller()
@ApplyRpcErrorHandling
export class DiscussionControllerMessage {
  constructor(private readonly discussionService: DiscussionService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.DISCUSSION })
  @UseGuards(AuthGuard)
  @MessagePattern('discussion.create')
  create(
    @Payload()
    payload: { createDiscussionDto: CreateDiscussionDto },
    @Ctx() context: IUserContext
  ) {
    return this.discussionService.create(payload.createDiscussionDto, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.DISCUSSION })
  @UseGuards(AuthGuard)
  @MessagePattern('discussion.findAll')
  findAll(@Payload() getDiscussionsDto: GetDiscussionsDto) {
    return this.discussionService.findAll(getDiscussionsDto);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.DISCUSSION })
  @UseGuards(AuthGuard)
  @MessagePattern('discussion.findOne')
  findOne(@Payload() id: string) {
    return this.discussionService.findOne(id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.DISCUSSION })
  @UseGuards(AuthGuard)
  @MessagePattern('discussion.update')
  update(
    @Payload()
    payload: {
      id: string;
      updateDiscussionDto: UpdateDiscussionDto;
    },
    @Ctx() context: IUserContext
  ) {
    return this.discussionService.update(payload.id, payload.updateDiscussionDto, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.DISCUSSION })
  @UseGuards(AuthGuard)
  @MessagePattern('discussion.remove')
  remove(@Payload() payload: { id: string }, @Ctx() context: IUserContext) {
    return this.discussionService.remove(
      payload.id,
      context.userPayload._id.toString(),
      context.userPayload.roleName,
      context.userPayload.organizationId?.toString()
    );
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.DISCUSSION })
  @UseGuards(AuthGuard)
  @MessagePattern('discussion.toggleLike')
  toggleLike(@Payload() payload: { id: string }, @Ctx() context: IUserContext) {
    return this.discussionService.toggleLike(payload.id, context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.DISCUSSION })
  @UseGuards(AuthGuard)
  @MessagePattern('discussion.getUserDiscussions')
  getUserDiscussions(@Payload() payload: { page?: number; limit?: number }, @Ctx() context: IUserContext) {
    return this.discussionService.getUserDiscussions(context.userPayload._id.toString(), payload.page, payload.limit);
  }
}
