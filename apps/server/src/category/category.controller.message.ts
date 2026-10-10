import { BadRequestException, Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { RpcValidationPipe } from '../utils/RpcValidationPipe';
import { AuthGuard } from '../auth/guards/auth.guard';
import { IUserContext } from '../utils/types/IUserContext.interface';
import { handleRpcError } from '../utils/errorHandling';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryService } from './category.service';
import { PaginateOptionsWithSearch } from '../utils/types/PaginateOptionsWithSearch';
import { UserErrors } from '@lms-organization/shared-types';

@Controller()
export class CategoryMessageController {
  constructor(private readonly categoryService: CategoryService) {}

  @UseGuards(AuthGuard)
  @MessagePattern('category.create')
  async create(
    @Payload(new RpcValidationPipe())
    createCategoryDto: CreateCategoryDto,
    @Ctx() context: IUserContext
  ) {
    try {
      if (!context.userPayload.organizationId) {
        throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
      }
      return await this.categoryService.create({
        ...createCategoryDto,
        organizationId: context.userPayload.organizationId.toString(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        code: 500,
        error: 'Internal Server Error',
      });
    }
  }

  @UseGuards(AuthGuard)
  @MessagePattern('category.update')
  async update(
    @Payload(new RpcValidationPipe())
    payload: {
      categoryId: string;
      data: UpdateCategoryDto;
    },
    @Ctx() context: IUserContext
  ) {
    try {
      const { categoryId, data } = payload;
      if (!context.userPayload.organizationId) {
        throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
      }
      return await this.categoryService.update(categoryId, data, context.userPayload.organizationId.toString());
    } catch (error) {
      handleRpcError(error);
    }
  }

  @UseGuards(AuthGuard)
  @MessagePattern('category.getAll')
  async getAll(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: PaginateOptionsWithSearch
  ) {
    try {
      return await this.categoryService.getAllWithAggregation(
        { ...payload, search: payload.search?.trim() ? payload.search.trim() : undefined },
        context.userPayload.organizationId?.toString(),
        null
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        code: 500,
        error: 'Internal Server Error',
      });
    }
  }

  @UseGuards(AuthGuard)
  @MessagePattern('category.getAllFlat')
  async getAllFlat(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: PaginateOptionsWithSearch
  ) {
    try {
      return await this.categoryService.getAllFlat(payload, context.userPayload.organizationId?.toString());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        code: 500,
        error: 'Internal Server Error',
      });
    }
  }

  @MessagePattern('category.filter')
  async setSearch(
    @Payload(new RpcValidationPipe())
    payload: PaginateOptionsWithSearch
  ) {
    try {
      return await this.categoryService.getAllFlat(
        { ...payload, search: payload.search?.trim() ? payload.search.trim() : undefined },
        undefined,
        true
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        code: 500,
        error: 'Internal Server Error',
      });
    }
  }

  @UseGuards(AuthGuard)
  @MessagePattern('category.getCategory')
  async setSingle(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { categoryId: string }
  ) {
    try {
      if (!context.userPayload.organizationId) {
        throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
      }
      return await this.categoryService.getCategoryWithRelations(context.userPayload.organizationId?.toString(), payload.categoryId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        code: 500,
        error: 'Internal Server Error',
      });
    }
  }

  @UseGuards(AuthGuard)
  @MessagePattern('category.delete')
  async delete(
    @Payload(new RpcValidationPipe())
    payload: {
      categoryId: string;
    },
    @Ctx() context: IUserContext
  ) {
    try {
      if (!context.userPayload.organizationId) {
        throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
      }
      return await this.categoryService.delete(payload.categoryId, context.userPayload.organizationId.toString(), context.userPayload._id);
    } catch (error) {
      handleRpcError(error);
    }
  }

  @MessagePattern('category.getOneApproved')
  async getOneApproved(@Payload() payload: { id: string }) {
    try {
      return await this.categoryService.getOneApproved(payload.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        code: 404,
        error: 'Not Found',
      });
    }
  }

  @MessagePattern('category.getAllApproved')
  async getAllApproved(
    @Payload(new RpcValidationPipe())
    payload: PaginateOptionsWithSearch
  ) {
    try {
      return await this.categoryService.getAllApprovedFlat(payload);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      throw new RpcException({
        message: errorMessage,
        code: 500,
        error: 'Internal Server Error',
      });
    }
  }
}
