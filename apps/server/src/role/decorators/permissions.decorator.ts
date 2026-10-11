import { SetMetadata } from '@nestjs/common';
import { Actions } from '@darnozom/shared-types';

export const PERMISSIONS_KEY = 'permissions';

interface RequiredPermission {
  action: string;
  subject: string;
  conditions?: unknown;
}

export const RequirePermissions = (...permissions: RequiredPermission[]) => SetMetadata(PERMISSIONS_KEY, permissions);

// Helper decorators for common permissions
export const CanCreate = (subject: string) => RequirePermissions({ action: Actions.CREATE, subject });

export const CanRead = (subject: string) => RequirePermissions({ action: Actions.READ, subject });

export const CanUpdate = (subject: string) => RequirePermissions({ action: Actions.UPDATE, subject });

export const CanDelete = (subject: string) => RequirePermissions({ action: Actions.DELETE, subject });

export const CanManage = (subject: string) => RequirePermissions({ action: Actions.MANAGE, subject });
