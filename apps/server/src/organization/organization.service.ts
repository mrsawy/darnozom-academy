import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { ApprovalStatus, OrganizationErrors } from '@islamic-academy/shared-types';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ReviewOrganizationDto } from './dto/review-organization.dto';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(@InjectModel(Organization.name) private readonly organizationModel: Model<Organization>) {}

  async create(createOrganizationDto: CreateOrganizationDto, session?: ClientSession) {
    try {
      const organization = new this.organizationModel(createOrganizationDto);
      return await organization.save({ session });
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 11_000) {
        throw new ConflictException(OrganizationErrors.SLUG_TAKEN);
      }
      throw new InternalServerErrorException(OrganizationErrors.ORGANIZATION_NOT_FOUND);
    }
  }

  findAll() {
    return this.organizationModel.find().exec();
  }

  async findOne(id: string) {
    const organization = await this.organizationModel.findById(id).exec();
    if (!organization) throw new NotFoundException(OrganizationErrors.ORGANIZATION_NOT_FOUND);
    return organization;
  }

  async findBySlug(slug: string) {
    const organization = await this.organizationModel.findOne({ slug }).exec();
    if (!organization) throw new NotFoundException(OrganizationErrors.ORGANIZATION_NOT_FOUND);
    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
    const organization = await this.organizationModel.findByIdAndUpdate(id, updateOrganizationDto, { new: true }).exec();
    if (!organization) throw new NotFoundException(OrganizationErrors.ORGANIZATION_NOT_FOUND);
    return organization;
  }

  async remove(id: string) {
    const organization = await this.organizationModel.findByIdAndDelete(id).exec();
    if (!organization) throw new NotFoundException(OrganizationErrors.ORGANIZATION_NOT_FOUND);
    return organization;
  }

  /** SUPER_ADMIN only — approve or reject a pending organization. */
  async review(id: string, reviewDto: ReviewOrganizationDto, reviewedById: string) {
    const organization = await this.organizationModel.findById(id).exec();
    if (!organization) throw new NotFoundException(OrganizationErrors.ORGANIZATION_NOT_FOUND);

    if (organization.approvalStatus !== ApprovalStatus.PENDING && organization.approvalStatus !== ApprovalStatus.PENDING_UPDATE) {
      throw new ForbiddenException(OrganizationErrors.ALREADY_REVIEWED);
    }

    organization.approvalStatus = reviewDto.approvalStatus;
    organization.approvalComment = reviewDto.approvalComment ?? null;
    organization.approvalReviewedBy = new Types.ObjectId(reviewedById);
    organization.approvalReviewedAt = new Date();

    return organization.save();
  }
}
