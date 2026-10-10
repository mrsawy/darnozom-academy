import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { GalleryPresignedUrlDto } from './dto/gallery-presigned.dto';
import { IUserRequest } from '../auth/interfaces/IUserRequest.interface';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @UseGuards(AuthGuard)
  @Post('presigned-url')
  async generatePresignedUrl(@Request() req: IUserRequest, @Body() dto: GalleryPresignedUrlDto) {
    const userId = req.user._id.toString();
    const username = req.user.username;
    return this.galleryService.generatePresignedUrl(userId, username, dto);
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@Request() req: IUserRequest, @Body() createGalleryDto: CreateGalleryDto) {
    const userId = req.user._id.toString();
    return this.galleryService.create(userId, createGalleryDto);
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(@Request() req: IUserRequest) {
    const userId = req.user._id.toString();
    return this.galleryService.findAll(userId);
  }
}
