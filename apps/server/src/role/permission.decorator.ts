import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PermissionDto } from './dto/permission.dto';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuthGuard } from 'src/auth/guards/auth.guard';

export const PERMISSIONS_KEY = 'permissions';
export const RequiredPermissions = (...permissions: PermissionDto[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Sets required permissions and applies PermissionsGuard in one decorator.
 * Use this instead of stacking @RequiredPermissions() and @UseGuards(PermissionsGuard).
 */
export const RequirePermissionsGuard = (...permissions: PermissionDto[]) =>
  applyDecorators(RequiredPermissions(...permissions), UseGuards(AuthGuard, PermissionsGuard));
