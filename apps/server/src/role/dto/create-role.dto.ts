import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Actions, Roles, Subjects } from '@islamic-academy/shared-types';

export class PermissionDto {
  @IsEnum(Actions)
  action: Actions;

  @IsEnum(Subjects)
  subject: Subjects;

  @IsOptional()
  conditions?: unknown;
}

export class CreateRoleDto {
  @IsEnum(Roles)
  name: Roles;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}
