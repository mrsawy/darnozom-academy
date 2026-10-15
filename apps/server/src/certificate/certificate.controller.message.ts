import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload } from '@nestjs/microservices';
import { Actions, Subjects } from '@darnozom/shared-types';
import { RequirePermissionsGuard } from 'src/role/permission.decorator';
import { RpcValidationPipe } from 'src/utils/RpcValidationPipe';
import { ApplyRpcErrorHandling } from 'src/utils/docerators/error-handeling/class/ApplyRpcErrorHandling.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { actorFromContext } from 'src/academics/common/actor';
import { CertificateService } from './services/certificate.service';
import {
  CertificateIdPayload,
  EvaluateGroupCertificatesPayload,
  GetCertificatesPayload,
  UpdateCertificateNamePayload,
  VerifyCertificatePayload,
} from './dto/certificate.dto';

@Controller()
@ApplyRpcErrorHandling
export class CertificateControllerMessage {
  constructor(private readonly certificateService: CertificateService) {}

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('certificates.evaluate')
  evaluate(
    @Payload(new RpcValidationPipe()) payload: EvaluateGroupCertificatesPayload,
    @Ctx() context: IUserContext,
  ) {
    return this.certificateService.evaluateGroup(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CERTIFICATE })
  @MessagePattern('certificates.list')
  list(
    @Payload(new RpcValidationPipe()) payload: GetCertificatesPayload,
    @Ctx() context: IUserContext,
  ) {
    return this.certificateService.find(actorFromContext(context), payload);
  }

  @RequirePermissionsGuard({ action: Actions.READ, subject: Subjects.CERTIFICATE })
  @MessagePattern('certificates.findOne')
  findOne(
    @Payload(new RpcValidationPipe()) payload: CertificateIdPayload,
    @Ctx() context: IUserContext,
  ) {
    return this.certificateService.findById(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.CERTIFICATE })
  @MessagePattern('certificates.updateName')
  updateName(
    @Payload(new RpcValidationPipe()) payload: UpdateCertificateNamePayload,
    @Ctx() context: IUserContext,
  ) {
    return this.certificateService.updateName(actorFromContext(context), payload.id, {
      nameAr: payload.nameAr,
      nameEn: payload.nameEn,
    });
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.CERTIFICATE })
  @MessagePattern('certificates.confirmName')
  confirmName(
    @Payload(new RpcValidationPipe()) payload: CertificateIdPayload,
    @Ctx() context: IUserContext,
  ) {
    return this.certificateService.confirmName(actorFromContext(context), payload.id);
  }

  @RequirePermissionsGuard({ action: Actions.UPDATE, subject: Subjects.GROUP })
  @MessagePattern('certificates.issue')
  issue(
    @Payload(new RpcValidationPipe()) payload: CertificateIdPayload,
    @Ctx() context: IUserContext,
  ) {
    return this.certificateService.issueCertificate(actorFromContext(context), payload.id);
  }

  @MessagePattern('certificates.verifyPublic')
  verifyPublic(
    @Payload(new RpcValidationPipe()) payload: VerifyCertificatePayload,
  ) {
    return this.certificateService.verifyPublic(payload.token);
  }
}
