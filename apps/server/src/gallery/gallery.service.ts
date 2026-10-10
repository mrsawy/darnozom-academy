import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel, PaginateOptions, Types } from 'mongoose';
import { Gallery, GalleryDocument } from './entities/gallery.entity';
import { FileService } from '../file/file.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { GalleryPresignedUrlDto } from './dto/gallery-presigned.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GalleryService {
  constructor(
    @InjectModel(Gallery.name) private galleryModel: PaginateModel<GalleryDocument>,
    private readonly fileService: FileService
  ) {}

  async generatePresignedUrl(userId: string, username: string, dto: GalleryPresignedUrlDto) {
    const { fileType, fileSize, fileName } = dto;
    const fileExtension = fileName.split('.').pop();

    // Construct key under explicit visibility namespace
    const visibilityPrefix = dto.isPublic ? 'public' : 'private';
    const fileKey = `${visibilityPrefix}/gallery/${username}/${uuidv4()}.${fileExtension}`;

    return this.fileService.generatePresignedUrl({
      fileType,
      fileSize,
      fileKey,
      userUserName: username,
      isPublic: dto.isPublic,
    });
  }

  async create(userId: string, createGalleryDto: CreateGalleryDto) {
    const createdGallery = new this.galleryModel({
      ...createGalleryDto,
      userId: new Types.ObjectId(userId),
    });
    return createdGallery.save();
  }

  async findAll(userId: string, options?: PaginateOptions) {
    return this.galleryModel.paginate({ userId: new Types.ObjectId(userId) }, { ...options, sort: { createdAt: -1 } });
  }

  async delete(userId: string, galleryId: string) {
    const gallery = await this.galleryModel
      .findOne({
        _id: new Types.ObjectId(galleryId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!gallery) {
      throw new NotFoundException(`Gallery item with id ${galleryId} not found`);
    }

    // Delete file from S3
    if (gallery.fileKey) {
      await this.fileService.deleteFile(gallery.fileKey);
    }

    // Delete gallery record
    await this.galleryModel.findByIdAndDelete(galleryId).exec();

    return { success: true, deletedId: galleryId };
  }
}
