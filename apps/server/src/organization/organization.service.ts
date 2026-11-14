import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Organization } from './entities/organization.entity';
import mongoose, { ClientSession, PaginateModel } from 'mongoose';
import { SubscriptionTypeDef } from 'src/utils/types/Subscription.interface';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { CreateSubscriptionDto } from 'src/subscription/dto/create-subscription.dto';
import { BillingCycle } from 'src/utils/enums/billingCycle.enum';
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR, DEFAULT_THEME_ID } from './constants/branding.constants';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: PaginateModel<Organization>,
    private readonly subscriptionService: SubscriptionService
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto & Partial<Pick<Organization, 'verification' | 'approvalStatus'>>,
    session?: ClientSession
  ) {
    try {
      const createdOrg = new this.organizationModel(createOrganizationDto);
      await createdOrg.save({ session });

      return {
        message: 'Organization created successfully',
        organization: createdOrg,
      };
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 11_000) {
        const errorObj = error as { keyValue?: Record<string, unknown> };
        if (errorObj.keyValue) {
          const field = Object.keys(errorObj.keyValue)[0];
          const fieldValue = errorObj.keyValue[field];
          const valueString = typeof fieldValue === 'string' ? fieldValue : typeof fieldValue === 'number' ? String(fieldValue) : '';
          throw new ConflictException(`${field} "${valueString}" already exists.`);
        }
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(`Failed to create organization: ${errorMessage}`);
    }
  }

  async filterOne(filters: mongoose.RootFilterQuery<Organization>) {
    const organization = await this.organizationModel.findOne(filters);
    if (!organization) throw new NotFoundException('Organization Not Found');
    return organization;
  }

  async findOne(id: string) {
    const organization = await this.organizationModel.findById(id);
    if (!organization) throw new NotFoundException('Organization Not Found');
    return organization;
  }

  async createOrganizationSubscription(organizationId: string, planId: string, subscriptionData: SubscriptionTypeDef) {
    try {
      const createDto: CreateSubscriptionDto = {
        organizationId,
        planId,
        billingCycle: subscriptionData.billing?.billingCycle ?? BillingCycle.ONE_TIME,
        startsAt: typeof subscriptionData.starts_at === 'string' ? new Date(subscriptionData.starts_at) : subscriptionData.starts_at,
        endsAt: subscriptionData.ends_at
          ? typeof subscriptionData.ends_at === 'string'
            ? new Date(subscriptionData.ends_at)
            : subscriptionData.ends_at
          : null,
        nextBillingAt: subscriptionData.next_billing
          ? typeof subscriptionData.next_billing === 'string'
            ? new Date(subscriptionData.next_billing)
            : subscriptionData.next_billing
          : null,
        transactionId: subscriptionData.transaction_id ?? null,
        billing: subscriptionData.billing
          ? {
              email: subscriptionData.billing.email,
              firstName: subscriptionData.billing.first_name,
              lastName: subscriptionData.billing.last_name,
              phoneNumber: subscriptionData.billing.phone_number,
              amount: subscriptionData.billing.amount,
              currency: subscriptionData.billing.currency,
              billingCycle: subscriptionData.billing.billingCycle,
            }
          : undefined,
      };
      await this.subscriptionService.create(createDto);
      return this.findOne(organizationId);
    } catch (error: unknown) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Validation failed');
    }
  }

  private toSettingsView(org: Organization) {
    const branding = org.settings?.branding;
    return {
      name: org.name,
      slug: org.slug,
      description: org.description ?? null,
      logoFileKey: branding?.logo || null,
      themeId: branding?.themeId || DEFAULT_THEME_ID,
      primaryColor: branding?.primaryColor || DEFAULT_PRIMARY_COLOR,
      secondaryColor: branding?.secondaryColor || DEFAULT_SECONDARY_COLOR,
    };
  }

  async getSettings(organizationId: string) {
    const org = await this.findOne(organizationId);
    return this.toSettingsView(org);
  }

  async updateSettings(organizationId: string, dto: UpdateOrganizationSettingsDto) {
    const update: Record<string, unknown> = {};
    if (dto.name !== undefined) update['name'] = dto.name;
    if (dto.description !== undefined) update['description'] = dto.description;
    if (dto.logoFileKey !== undefined) update['settings.branding.logo'] = dto.logoFileKey;
    if (dto.primaryColor !== undefined) update['settings.branding.primaryColor'] = dto.primaryColor;
    if (dto.secondaryColor !== undefined) update['settings.branding.secondaryColor'] = dto.secondaryColor;
    if (dto.themeId !== undefined) update['settings.branding.themeId'] = dto.themeId;

    const org = await this.organizationModel.findByIdAndUpdate(organizationId, { $set: update }, { new: true });
    if (!org) throw new NotFoundException('Organization Not Found');
    return this.toSettingsView(org);
  }

  async renewOrganizationSubscription(organizationId: string, subscriptionData: Partial<SubscriptionTypeDef>) {
    try {
      const organization = await this.findOne(organizationId);
      const subscriptionId = organization.subscriptionId;
      if (!subscriptionId) {
        throw new BadRequestException('Organization has no subscription to renew.');
      }
      const currentSubscription = await this.subscriptionService.findOne(subscriptionId.toString());

      const renewDto: Parameters<typeof this.subscriptionService.expireCurrentAndCreateNewPeriod>[1] = {};
      if (subscriptionData.ends_at !== undefined) {
        renewDto.endsAt = typeof subscriptionData.ends_at === 'string' ? new Date(subscriptionData.ends_at) : subscriptionData.ends_at;
      }
      if (subscriptionData.next_billing !== undefined) {
        renewDto.nextBillingAt =
          typeof subscriptionData.next_billing === 'string' ? new Date(subscriptionData.next_billing) : subscriptionData.next_billing;
      }
      if (subscriptionData.billing) {
        renewDto.billing = {
          email: subscriptionData.billing.email,
          firstName: subscriptionData.billing.first_name,
          lastName: subscriptionData.billing.last_name,
          phoneNumber: subscriptionData.billing.phone_number,
          amount: subscriptionData.billing.amount,
          currency: subscriptionData.billing.currency,
          billingCycle: subscriptionData.billing.billingCycle,
        };
      }
      await this.subscriptionService.expireCurrentAndCreateNewPeriod(currentSubscription, renewDto);
      return this.findOne(organizationId);
    } catch (error: unknown) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Validation failed');
    }
  }
}
