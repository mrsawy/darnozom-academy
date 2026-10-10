import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, ValidateNested } from 'class-validator';
import { Roles } from '@lms-organization/shared-types';
import { PermissionDto } from './permission.dto';

export class CreateRoleDto {
  @IsEnum(Roles)
  @IsNotEmpty()
  name: Roles;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}
