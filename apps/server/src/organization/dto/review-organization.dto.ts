import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApprovalStatus } from '@islamic-academy/shared-types';

export class ReviewOrganizationDto {
  @IsEnum(ApprovalStatus)
  approvalStatus: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED;

  @IsOptional()
  @IsString()
  approvalComment?: string;
}
