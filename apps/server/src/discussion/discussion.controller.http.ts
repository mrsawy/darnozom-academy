import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { GetDiscussionsDto } from './dto/get-discussions.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';

@Controller('discussion')
@UseGuards(AuthGuard)
export class DiscussionControllerHttp {
  constructor(private readonly discussionService: DiscussionService) {}

  @Post()
  create(@Body() createDiscussionDto: CreateDiscussionDto, @Request() req: IUserRequest) {
    return this.discussionService.create(createDiscussionDto, req.user._id.toString());
  }

  @Get()
  findAll(@Query() getDiscussionsDto: GetDiscussionsDto) {
    return this.discussionService.findAll(getDiscussionsDto);
  }

  @Get('user/:userId')
  getUserDiscussions(@Param('userId') userId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.discussionService.getUserDiscussions(userId, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.discussionService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDiscussionDto: UpdateDiscussionDto, @Request() req: IUserRequest) {
    return this.discussionService.update(id, updateDiscussionDto, req.user._id.toString());
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: IUserRequest) {
    return this.discussionService.remove(id, req.user._id.toString(), req.user.roleName, req.user.organizationId?.toString());
  }

  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Request() req: IUserRequest) {
    return this.discussionService.toggleLike(id, req.user._id.toString());
  }
}
