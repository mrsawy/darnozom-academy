import { BadRequestException, Controller, NotFoundException, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { PageService } from './page.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import mongoose, { PaginateOptions, Types } from 'mongoose';
import { Page } from './entities/page.entity';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { Actions, PageErrors, Subjects, UserErrors } from '@lms-organization/shared-types';
import { CheckSubscriptionLimit } from 'src/subscription/decorators/check-subscription-limit.decorator';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';

@ApplyRpcErrorHandling
@Controller()
export class PageControllerMessage {
  constructor(
    private readonly pageService: PageService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.PAGE })
  @CheckSubscriptionLimit('pagesPerSubscription')
  @MessagePattern('pages.createPage')
  async create(@Payload() createPageDto: CreatePageDto, @Ctx() context: IUserContext) {
    if (!context.userPayload.organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }
    const organizationId = context.userPayload.organizationId.toString();
    const createdPage = await this.pageService.create({
      ...createPageDto,
      userId: new Types.ObjectId(context.userPayload._id.toString()),
      organizationId: new Types.ObjectId(context.userPayload.organizationId),
    });
    await this.subscriptionService.incrementUsage(organizationId, 'pagesUsed');
    return createdPage;
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PAGE })
  @UseGuards(AuthGuard)
  @MessagePattern('pages.findAllPages')
  async findAll(@Ctx() context: IUserContext, @Payload() payload: { options: PaginateOptions }) {
    return await this.pageService.findAll({
      filters: {
        organizationId: new Types.ObjectId(context.userPayload.organizationId),
      },
      options: payload.options,
    });
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PAGE })
  @MessagePattern('pages.findOnePage')
  async findOne(@Payload() payload: mongoose.RootFilterQuery<Page> & { authorization?: string }, @Ctx() context: IUserContext) {
    // Strip transport-only fields (authorization token) before building the Mongo filter.
    const { authorization: _authorization, ...rawFilters } = payload;
    const filters = convertObjectValuesToObjectId(rawFilters) as mongoose.FilterQuery<Page>;
    // Scope lookups to the caller's organization so a slug cannot leak across tenants.
    if (context.userPayload.organizationId) {
      filters.organizationId = new Types.ObjectId(context.userPayload.organizationId);
    }
    const response = await this.pageService.findOne(filters);
    if (!response) throw new NotFoundException(PageErrors.PAGE_NOT_FOUND);
    return response;
  }

  /** No auth — for public `/x/[org]/[page]` views. Always enforces `published: true` server-side. */
  @MessagePattern('pages.findPublishedPage')
  async findPublishedPage(@Payload() payload: { organizationId: string; slug: string }) {
    const organizationId = new Types.ObjectId(payload.organizationId);
    const pageSlug = payload.slug.trim().toLowerCase();
    const response = await this.pageService.findOnePublishedForOrganization(organizationId, pageSlug);
    if (!response) throw new NotFoundException(PageErrors.PAGE_NOT_FOUND);
    return response;
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.PAGE })
  @MessagePattern('pages.updatePage')
  async update(@Payload() updatePageDto: UpdatePageDto) {
    return await this.pageService.update({
      filters: { slug: updatePageDto.slug },
      updatePageDto,
    });
  }

  @RequirePermissionsGuard({ action: Actions.DELETE, subject: Subjects.PAGE })
  @UseGuards(AuthGuard)
  @MessagePattern('pages.deletePage')
  async delete(@Payload() payload: mongoose.RootFilterQuery<Page>, @Ctx() context: IUserContext) {
    const organizationId = new Types.ObjectId(context.userPayload.organizationId);
    const filtersObj = Object.assign({}, payload, { organizationId });
    const filters = convertObjectValuesToObjectId(filtersObj);
    return await this.pageService.delete(filters);
  }
}
