import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApprovalStatus } from '@darnozom/shared-types';

export class ReviewOrganizationDto {
  @IsEnum(ApprovalStatus)
  approvalStatus: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED;

  @IsOptional()
  @IsString()
  approvalComment?: string;
}
