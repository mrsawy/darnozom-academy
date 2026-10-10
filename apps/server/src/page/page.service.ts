import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import mongoose, { Model, PaginateModel } from 'mongoose';
import { Page } from './entities/page.entity';
import { InjectModel } from '@nestjs/mongoose';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { PageErrors } from '@lms-organization/shared-types';
import { convertObjectValuesToObjectId } from 'src/utils/ObjectId.utils';
import { Organization } from 'src/organization/entities/organization.entity';
import { assertOrgApproved } from 'src/utils/verification.utils';

@Injectable()
export class PageService {
  constructor(
    @InjectModel(Page.name) private PageModel: PaginateModel<Page>,
    @InjectModel(Organization.name) private organizationModel: Model<Organization>
  ) {}

  async create(createPageDto: CreatePageDto) {
    const org = await this.organizationModel.findById(convertObjectValuesToObjectId(createPageDto.organizationId));
    assertOrgApproved(org);
    const foundedPage = await this.PageModel.findOne({
      slug: createPageDto.slug,
      organizationId: convertObjectValuesToObjectId(createPageDto.organizationId),
    }).exec();
    if (foundedPage) {
      throw new ConflictException(PageErrors.PAGE_SLUG_TAKEN);
    }
    return await this.PageModel.create(createPageDto);
  }

  async findAll({ filters, options }: { filters: mongoose.FilterQuery<Page>; options: mongoose.PaginateOptions }) {
    return await this.PageModel.paginate(filters, options);
  }

  async findOne(filters: mongoose.FilterQuery<Page>) {
    return await this.PageModel.findOne(filters);
  }

  /** Public site: only returns a row when `published` is true. */
  findOnePublishedForOrganization(organizationId: mongoose.Types.ObjectId, pageSlug: string) {
    return this.PageModel.findOne({
      organizationId,
      slug: pageSlug,
      published: true,
    });
  }

  update({ filters, updatePageDto }: { filters: mongoose.FilterQuery<Page>; updatePageDto: UpdatePageDto }) {
    return this.PageModel.findOneAndUpdate(filters, updatePageDto, {
      new: true,
    });
  }

  async delete(filters: mongoose.FilterQuery<Page>) {
    const result = await this.PageModel.deleteOne(filters);
    if (!result.deletedCount) {
      throw new BadRequestException("Couldn't find page to delete");
    }
    return { success: true, deletedCount: result.deletedCount };
  }
}
