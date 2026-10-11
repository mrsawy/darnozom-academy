import { IsArray, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AccessType } from '@darnozom/shared-types';

/**
 * RPC payload for {@link MessagePattern} `reports.organizationMemberDashboard`.
 */
export class GetOrganizationMemberReportsDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(AccessType, { each: true })
  accessTypes?: AccessType[];
}
