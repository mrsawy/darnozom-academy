import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Actions, ConditionKeys, Subjects } from '@lms-organization/shared-types';

export class ConditionEntryDto {
  @IsEnum(ConditionKeys)
  key: ConditionKeys;

  @IsString()
  value: string;
}

export class PermissionDto {
  @IsEnum(Actions)
  action: Actions;

  @IsEnum(Subjects)
  subject: Subjects;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionEntryDto)
  conditions?: ConditionEntryDto[];
}
