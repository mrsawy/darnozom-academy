import { IsArray, IsDateString, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { AccessType } from '@darnozom/shared-types';

export class GetInstructorReportsDto {
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

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  courseIds?: string[];
}
