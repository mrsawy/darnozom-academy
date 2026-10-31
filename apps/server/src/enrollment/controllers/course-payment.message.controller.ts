import { BadRequestException, Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects, UserErrors } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import {
  CourseIdPayload,
  CoursePaymentIdPayload,
  ListCoursePaymentsPayload,
  RejectCoursePaymentPayload,
  SubmitCoursePaymentPayload,
} from '../dto/course-payment.dto';
import { CoursePaymentService } from '../services/course-payment.service';

const requireOrgId = (context: IUserContext): string => {
  const organizationId = context.userPayload.organizationId?.toString();
  if (!organizationId) throw new BadRequestException(UserErrors.ORGANIZATION_ID_REQUIRED);
  return organizationId;
};

@Controller()
@ApplyRpcErrorHandling
export class CoursePaymentMessageController {
  constructor(private readonly coursePayments: CoursePaymentService) {}

  /** Public: transfer methods enabled by the course's organization + price per billing cycle. */
  @MessagePattern('coursePayment.options')
  options(@Payload(new RpcValidationPipe()) payload: CourseIdPayload) {
    return this.coursePayments.getOptions(payload.courseId);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.ENROLLMENT })
  @MessagePattern('coursePayment.submit')
  submit(@Payload(new RpcValidationPipe()) payload: SubmitCoursePaymentPayload, @Ctx() context: IUserContext) {
    return this.coursePayments.submit(context.userPayload._id.toString(), context.userPayload.roleName, payload);
  }

  @RequirePermissionsGuard({ action: Actions.CREATE, subject: Subjects.ENROLLMENT })
  @MessagePattern('coursePayment.listMine')
  listMine(@Ctx() context: IUserContext) {
    return this.coursePayments.listMine(context.userPayload._id.toString());
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.ENROLLMENT })
  @MessagePattern('coursePayment.listForOrg')
  listForOrg(@Payload(new RpcValidationPipe()) payload: ListCoursePaymentsPayload, @Ctx() context: IUserContext) {
    return this.coursePayments.listForOrg(requireOrgId(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.ENROLLMENT })
  @MessagePattern('coursePayment.approve')
  async approve(@Payload(new RpcValidationPipe()) payload: CoursePaymentIdPayload, @Ctx() context: IUserContext) {
    await this.coursePayments.approve(context.userPayload._id.toString(), requireOrgId(context), payload.paymentId);
    return { success: true };
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.ENROLLMENT })
  @MessagePattern('coursePayment.reject')
  async reject(@Payload(new RpcValidationPipe()) payload: RejectCoursePaymentPayload, @Ctx() context: IUserContext) {
    await this.coursePayments.reject(context.userPayload._id.toString(), requireOrgId(context), payload.paymentId, payload.reason);
    return { success: true };
  }
}
