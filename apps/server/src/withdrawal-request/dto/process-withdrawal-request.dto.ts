import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { WithdrawalRequestStatus } from '@lms-organization/shared-types';

export class ProcessWithdrawalRequestDto {
  @IsEnum([WithdrawalRequestStatus.APPROVED, WithdrawalRequestStatus.REJECTED])
  status: WithdrawalRequestStatus.APPROVED | WithdrawalRequestStatus.REJECTED;

  @IsString()
  @IsOptional()
  adminNote?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  proofImageKeys?: string[];
}
