import { Controller, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload, Ctx } from '@nestjs/microservices';
import { WishlistService } from '../service/wishlist.service';
import { CreateWishlistDto } from '../dto/create-wishlist.dto';
import { GetWishlistDto } from '../dto/get-wishlist.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { RpcErrorHandler } from 'src/utils/docerators/error-handeling/method/RpcErrController.decorator';
import { Wishlist } from '../entities/wishlist.entity';
import { PaginateResult } from 'mongoose';
import { WishlistWithPopulated } from '../types/wishlist-with-populated.type';

@Controller()
export class WishlistControllerMessage {
  constructor(private readonly wishlistService: WishlistService) {}

  @UseGuards(AuthGuard)
  @MessagePattern('wishlist.create')
  @RpcErrorHandler
  async create(@Payload(new RpcValidationPipe()) createWishlistDto: CreateWishlistDto, @Ctx() context: IUserContext): Promise<Wishlist> {
    return await this.wishlistService.create({
      ...createWishlistDto,
      userId: context.userPayload._id.toString(),
    });
  }

  @UseGuards(AuthGuard)
  @MessagePattern('wishlist.findAll')
  @RpcErrorHandler
  async findAll(
    @Payload(new RpcValidationPipe()) getWishlistDto: GetWishlistDto,
    @Ctx() context: IUserContext
  ): Promise<PaginateResult<WishlistWithPopulated>> {
    return await this.wishlistService.findAll({
      ...getWishlistDto,
      userId: context.userPayload._id.toString(),
    });
  }

  @UseGuards(AuthGuard)
  @MessagePattern('wishlist.findMyWishlist')
  @RpcErrorHandler
  async findMyWishlist(
    @Payload(new RpcValidationPipe()) getWishlistDto: GetWishlistDto,
    @Ctx() context: IUserContext
  ): Promise<PaginateResult<WishlistWithPopulated>> {
    return await this.wishlistService.findAll({
      ...getWishlistDto,
      userId: context.userPayload._id.toString(),
    });
  }

  @UseGuards(AuthGuard)
  @MessagePattern('wishlist.findOne')
  @RpcErrorHandler
  async findOne(@Payload() payload: { id: string }, @Ctx() context: IUserContext): Promise<WishlistWithPopulated> {
    return await this.wishlistService.findOne(payload.id, context.userPayload._id.toString());
  }

  @UseGuards(AuthGuard)
  @MessagePattern('wishlist.remove')
  @RpcErrorHandler
  async remove(@Payload() payload: { id: string }, @Ctx() context: IUserContext): Promise<Wishlist> {
    // findOne will verify ownership and throw if not found or doesn't belong to user
    await this.wishlistService.findOne(payload.id, context.userPayload._id.toString());

    return await this.wishlistService.remove(payload.id);
  }

  @UseGuards(AuthGuard)
  @MessagePattern('wishlist.removeByCourse')
  @RpcErrorHandler
  async removeByCourse(@Payload() payload: { courseId: string }, @Ctx() context: IUserContext): Promise<Wishlist> {
    return await this.wishlistService.removeByUserAndCourse(context.userPayload._id.toString(), payload.courseId);
  }
}
