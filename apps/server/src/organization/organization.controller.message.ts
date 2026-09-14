import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ReviewOrganizationDto } from './dto/review-organization.dto';
import { RpcValidationPipe } from '../utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from '../utils/decorators/apply-rpc-error-handling.decorator';

@ApplyRpcErrorHandling
@Controller()
export class OrganizationControllerMessage {
  constructor(private readonly organizationService: OrganizationService) {}

  @MessagePattern('organization.create')
  create(@Payload(new RpcValidationPipe()) createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.create(createOrganizationDto);
  }

  @MessagePattern('organization.findAll')
  findAll() {
    return this.organizationService.findAll();
  }

  @MessagePattern('organization.findOne')
  findOne(@Payload('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @MessagePattern('organization.update')
  update(@Payload() payload: { id: string; updateOrganizationDto: UpdateOrganizationDto }) {
    return this.organizationService.update(payload.id, payload.updateOrganizationDto);
  }

  @MessagePattern('organization.remove')
  remove(@Payload('id') id: string) {
    return this.organizationService.remove(id);
  }

  @MessagePattern('organization.review')
  review(@Payload() payload: { id: string; reviewDto: ReviewOrganizationDto; reviewedById: string }) {
    return this.organizationService.review(payload.id, payload.reviewDto, payload.reviewedById);
  }
}
