import { Controller, Get, Post, Delete, Param, UseGuards, Request, Query, Body } from '@nestjs/common';
import { WishlistService } from '../service/wishlist.service';
import { CreateWishlistDto } from '../dto/create-wishlist.dto';
import { GetWishlistDto } from '../dto/get-wishlist.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserRequest } from 'src/auth/interfaces/IUserRequest.interface';
import { Wishlist } from '../entities/wishlist.entity';
import { PaginateResult } from 'mongoose';
import { WishlistWithPopulated } from '../types/wishlist-with-populated.type';
@Controller('wishlist')
export class WishlistControllerHttp {
  constructor(private readonly wishlistService: WishlistService) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() createWishlistDto: CreateWishlistDto, @Request() req: IUserRequest): Promise<Wishlist> {
    return await this.wishlistService.create({
      ...createWishlistDto,
      userId: req.user._id.toString(),
    });
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(@Query() getWishlistDto: GetWishlistDto, @Request() req: IUserRequest): Promise<PaginateResult<WishlistWithPopulated>> {
    return await this.wishlistService.findAll({
      ...getWishlistDto,
      userId: req.user._id.toString(),
    });
  }

  @Get('my-wishlist')
  @UseGuards(AuthGuard)
  async findMyWishlist(@Query() getWishlistDto: GetWishlistDto, @Request() req: IUserRequest): Promise<PaginateResult<WishlistWithPopulated>> {
    return await this.wishlistService.findAll({
      ...getWishlistDto,
      userId: req.user._id.toString(),
    });
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: IUserRequest): Promise<WishlistWithPopulated> {
    return await this.wishlistService.findOne(id, req.user._id.toString());
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: IUserRequest): Promise<Wishlist> {
    // findOne will verify ownership and throw if not found or doesn't belong to user
    await this.wishlistService.findOne(id, req.user._id.toString());

    return await this.wishlistService.remove(id);
  }

  @UseGuards(AuthGuard)
  @Delete('course/:courseId')
  async removeByCourse(@Param('courseId') courseId: string, @Request() req: IUserRequest): Promise<Wishlist> {
    return await this.wishlistService.removeByUserAndCourse(req.user._id.toString(), courseId);
  }
}
