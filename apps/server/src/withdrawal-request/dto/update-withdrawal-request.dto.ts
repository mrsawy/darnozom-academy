import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { WithdrawalMethod } from '@lms-organization/shared-types';

export class UpdateWithdrawalRequestDto {
  @IsEnum(WithdrawalMethod)
  @IsOptional()
  method?: WithdrawalMethod;

  @IsObject()
  @IsOptional()
  methodDetails?: Record<string, string>;

  @IsString()
  @IsOptional()
  userNote?: string;
}
