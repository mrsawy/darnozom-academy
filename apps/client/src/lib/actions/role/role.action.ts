'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { Actions, ConditionKeys, Roles, Subjects } from '@darnozom/shared-types';

export interface RolePermissionPayload {
  action: Actions;
  subject: Subjects;
  conditions?: { key: ConditionKeys; value: string }[];
}

export interface RoleResponse {
  _id: string;
  name: Roles;
  permissions: RolePermissionPayload[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRolePayload {
  name: Roles;
  permissions: RolePermissionPayload[];
}

export interface UpdateRolePayload {
  permissions?: RolePermissionPayload[];
}

export async function getRoles() {
  return createAuthorizedNatsRequest<RoleResponse[] | { err: { message: string } }>(
    'role.findAll',
    {}
  );
}

export async function createRole(data: CreateRolePayload) {
  return createAuthorizedNatsRequest<
    { role: RoleResponse; message: string } | { err: { message: string } }
  >('role.create', data);
}

export async function updateRole(id: string, data: UpdateRolePayload) {
  return createAuthorizedNatsRequest<
    { role: RoleResponse; message: string } | { err: { message: string } }
  >('role.update', { id, data });
}

export async function deleteRole(id: string) {
  return createAuthorizedNatsRequest<{ message: string } | { err: { message: string } }>(
    'role.delete',
    {
      id,
    }
  );
}
