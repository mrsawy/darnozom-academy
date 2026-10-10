import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrganizationService } from './organization.service';
import { Controller } from '@nestjs/common';
import mongoose from 'mongoose';
import { Organization } from './entities/organization.entity';

@Controller()
export class OrganizationControllerMessage {
  constructor(private readonly organizationService: OrganizationService) {}

  @MessagePattern('organization.findOne')
  findOne(@Payload() payload: mongoose.RootFilterQuery<Organization>) {
    for (const key in payload) {
      if (mongoose.Types.ObjectId.isValid(payload[key] as string)) {
        payload[key] = new mongoose.Types.ObjectId(payload[key] as string);
      }
    }
    return this.organizationService.filterOne(payload);
  }
}
