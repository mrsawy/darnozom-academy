import { BadRequestException, Controller, UseGuards } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { Actions, ParentErrors, ParentSuccessMessages, Roles, Subjects, UserErrors } from '@darnozom/shared-types';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { ParentService } from '../../services/parent.service';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { CreateChildDto } from '../../dto/create-child.dto';
import { UpdateChildDto } from '../../dto/update-child.dto';
import { CreateParentForStudentDto } from '../../dto/create-parent-for-student.dto';

@ApplyRpcErrorHandling
@Controller('parent')
export class ParentControllerMessage {
  constructor(private readonly parentService: ParentService) {}

  // ─── Org-scoped progress endpoints (existing) ────────────────────────────

  @MessagePattern('parents.studentsProgress')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PARENT })
  @UseGuards(AuthGuard)
  async getRelatedStudentsProgress(@Ctx() context: IUserContext, @Payload() payload?: { dateFrom?: string; dateTo?: string; search?: string }) {
    const organizationId = context.userPayload.organizationId;
    return await this.parentService.getRelatedStudentsProgress(
      new mongoose.Types.ObjectId(context.userPayload._id),
      organizationId ? new mongoose.Types.ObjectId(organizationId) : undefined,
      payload
    );
  }

  @MessagePattern('parents.studentProgress')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PARENT })
  @UseGuards(AuthGuard)
  async getSingleRelatedStudentProgress(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { studentId: string; dateFrom?: string; dateTo?: string; search?: string }
  ) {
    const organizationId = context.userPayload.organizationId;
    const { studentId, dateFrom, dateTo, search } = payload;
    return await this.parentService.getSingleRelatedStudentProgress(
      new mongoose.Types.ObjectId(context.userPayload._id),
      new mongoose.Types.ObjectId(studentId),
      organizationId ? new mongoose.Types.ObjectId(organizationId) : undefined,
      dateFrom || dateTo || search ? { dateFrom, dateTo, search } : undefined
    );
  }

  @MessagePattern('parents.enrollmentDetails')
  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.PARENT })
  @UseGuards(AuthGuard)
  async getRelatedStudentEnrollmentDetails(
    @Ctx() context: IUserContext,
    @Payload(new RpcValidationPipe())
    payload: { enrollmentId: string }
  ) {
    if (!mongoose.Types.ObjectId.isValid(payload.enrollmentId)) {
      throw new BadRequestException(ParentErrors.INVALID_ENROLLMENT_ID);
    }
    const organizationId = context.userPayload.organizationId;
    return await this.parentService.getRelatedStudentEnrollmentDetails(
      new mongoose.Types.ObjectId(context.userPayload._id),
      new mongoose.Types.ObjectId(payload.enrollmentId),
      organizationId ? new mongoose.Types.ObjectId(organizationId) : undefined
    );
  }

  // ─── Self-service parent endpoints (new) ─────────────────────────────────

  @MessagePattern('parents.createChild')
  @UseGuards(AuthGuard)
  async createChild(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: CreateChildDto) {
    if (context.userPayload.roleName !== Roles.PARENT) {
      throw new BadRequestException(ParentErrors.USER_NOT_A_PARENT);
    }
    return await this.parentService.createChildStudent(new mongoose.Types.ObjectId(context.userPayload._id), payload);
  }

  @MessagePattern('parents.getChildren')
  @UseGuards(AuthGuard)
  async getChildren(@Ctx() context: IUserContext) {
    if (context.userPayload.roleName !== Roles.PARENT) {
      throw new BadRequestException(ParentErrors.USER_NOT_A_PARENT);
    }
    return await this.parentService.getChildren(new mongoose.Types.ObjectId(context.userPayload._id));
  }

  @MessagePattern('parents.updateChild')
  @UseGuards(AuthGuard)
  async updateChild(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: { childId: string; data: UpdateChildDto }) {
    if (context.userPayload.roleName !== Roles.PARENT) {
      throw new BadRequestException(ParentErrors.USER_NOT_A_PARENT);
    }
    if (!mongoose.Types.ObjectId.isValid(payload.childId)) {
      throw new BadRequestException(ParentErrors.INVALID_CHILD_ID);
    }
    await this.parentService.updateChild(
      new mongoose.Types.ObjectId(context.userPayload._id),
      new mongoose.Types.ObjectId(payload.childId),
      payload.data
    );
    return { message: ParentSuccessMessages.CHILD_UPDATED };
  }

  @MessagePattern('parents.getParentData')
  @UseGuards(AuthGuard)
  async getParentData(@Ctx() context: IUserContext) {
    if (context.userPayload.roleName !== Roles.STUDENT) {
      throw new BadRequestException(UserErrors.USER_NOT_A_STUDENT);
    }
    return await this.parentService.getLinkedParentInfo(new mongoose.Types.ObjectId(context.userPayload._id));
  }

  @MessagePattern('parents.createParentForStudent')
  @UseGuards(AuthGuard)
  async createParentForStudent(@Ctx() context: IUserContext, @Payload(new RpcValidationPipe()) payload: CreateParentForStudentDto) {
    if (context.userPayload.roleName !== Roles.STUDENT) {
      throw new BadRequestException(UserErrors.USER_NOT_A_STUDENT);
    }
    await this.parentService.createParentForStudent(new mongoose.Types.ObjectId(context.userPayload._id), payload);
    return { message: ParentSuccessMessages.PARENT_CREATED };
  }
}
