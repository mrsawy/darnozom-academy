import { Controller, UseGuards } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { MessagePattern, Payload, Ctx, RpcException } from '@nestjs/microservices';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { GalleryPresignedUrlDto } from './dto/gallery-presigned.dto';
import { IUserContext } from '../utils/types/IUserContext.interface';
import { RpcValidationPipe } from '../utils/RpcValidationPipe';
import { PaginateOptions } from 'mongoose';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { Actions, Subjects } from '@lms-organization/shared-types';

@Controller()
export class GalleryControllerMessage {
  constructor(private readonly galleryService: GalleryService) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.GALLERY })
  @UseGuards(AuthGuard)
  @MessagePattern('gallery.generatePresignedUrl')
  async generatePresignedUrl(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) dto: GalleryPresignedUrlDto) {
    try {
      const userId = context.userPayload._id.toString();
      const username = context.userPayload.username;
      return await this.galleryService.generatePresignedUrl(userId, username, dto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      throw new RpcException(errorMessage);
    }
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.GALLERY })
  @UseGuards(AuthGuard)
  @MessagePattern('gallery.create')
  async create(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) createGalleryDto: CreateGalleryDto) {
    try {
      const userId = context.userPayload._id.toString();
      return await this.galleryService.create(userId, createGalleryDto);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      throw new RpcException(errorMessage);
    }
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.GALLERY })
  @UseGuards(AuthGuard)
  @MessagePattern('gallery.findAll')
  async findAll(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) paginateOptions: PaginateOptions) {
    try {
      const userId = context.userPayload._id.toString();
      return await this.galleryService.findAll(userId, paginateOptions);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      throw new RpcException(errorMessage);
    }
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.GALLERY })
  @UseGuards(AuthGuard)
  @MessagePattern('gallery.delete')
  async delete(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) dto: { galleryId: string }) {
    try {
      const userId = context.userPayload._id.toString();
      return await this.galleryService.delete(userId, dto.galleryId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      throw new RpcException(errorMessage);
    }
  }
}
