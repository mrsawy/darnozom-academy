import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { PermissionDto } from './permission.dto';

/**
 * Only permissions can be updated. The role name is immutable after creation
 * to prevent orphaning user assignments (users store roleName as a string field).
 */
export class UpdateRoleDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions?: PermissionDto[];
}
