import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { OrganizationService } from './organization.service';
import { Controller } from '@nestjs/common';
import mongoose from 'mongoose';
import { Organization } from './entities/organization.entity';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from 'src/academics/common/actor';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';

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

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.SETTING })
  @MessagePattern('organization.settings.get')
  getSettings(@Ctx() context: IUserContext) {
    return this.organizationService.getSettings(actorFromContext(context).organizationId);
  }

  @RequirePermissionsGuard({ action: Actions.MANAGE, subject: Subjects.SETTING })
  @MessagePattern('organization.settings.update')
  updateSettings(@Payload(new RpcValidationPipe()) payload: UpdateOrganizationSettingsDto, @Ctx() context: IUserContext) {
    return this.organizationService.updateSettings(actorFromContext(context).organizationId, payload);
  }
}
