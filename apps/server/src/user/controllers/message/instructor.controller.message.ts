import { Controller, UseGuards, BadRequestException } from '@nestjs/common';
import { InstructorService } from '../../services/instructor.service';
import { AuthGuard } from '../../../auth/guards/auth.guard';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { IUserContext } from '../../../utils/types/IUserContext.interface';
import { RpcValidationPipe } from '../../../utils/RpcValidationPipe';
import mongoose, { PaginateOptions } from 'mongoose';
import { User } from '../../entities/user.entity';
import { convertObjectValuesToObjectId } from '../../../utils/ObjectId.utils';
import { ApplyRpcErrorHandling } from '../../../utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { UserErrors } from '@darnozom/shared-types';
import { FindInstructorsDto } from '../../dto/find-instructors.dto';

@ApplyRpcErrorHandling
@Controller('instructor')
export class InstructorControllerMessage {
  constructor(private readonly instructorService: InstructorService) {}

  @MessagePattern('instructors.findAll')
  async findAll(
    @Payload(new RpcValidationPipe())
    payload: {
      options?: PaginateOptions;
      filters?: FindInstructorsDto;
    }
  ) {
    // Flat filters only — the service builds the Mongo query (with regex escaping)
    // and converts ids to ObjectIds. No Mongo operators are constructed here.
    const { page, limit, ...options } = payload.options ?? {};
    return await this.instructorService.findAll({ ...options, page, limit }, payload.filters ?? {});
  }

  @MessagePattern('instructors.findOne')
  async findOne(
    @Payload(new RpcValidationPipe())
    payload: {
      instructorId: string;
    }
  ) {
    return await this.instructorService.filterOne({
      _id: payload.instructorId,
    });
  }

  @MessagePattern('instructors.filterOne')
  @UseGuards(AuthGuard)
  async filterOne(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: {
      filters: mongoose.RootFilterQuery<User>;
    }
  ) {
    const organizationId = context.userPayload.organizationId;
    if (!organizationId) {
      throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
    }

    const convertedFilters = convertObjectValuesToObjectId(payload.filters);
    const filters: mongoose.RootFilterQuery<User> = Object.assign(
      { organizationId: new mongoose.Types.ObjectId(organizationId) },
      convertedFilters
    ) as mongoose.RootFilterQuery<User>;

    return await this.instructorService.filterOne(filters);
  }

  @MessagePattern('instructors.getFeatured')
  async getFeatured(
    @Payload(new RpcValidationPipe())
    payload: {
      limit: number;
    }
  ) {
    const result = await this.instructorService.getFeatured(payload.limit);
    return result;
  }
}
