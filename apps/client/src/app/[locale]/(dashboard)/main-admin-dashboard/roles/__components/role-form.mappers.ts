import type { RolePermissionPayload, RoleResponse } from '@/lib/actions/role/role.action';
import { ConditionKeys } from '@lms-organization/shared-types';
import { defaultPermissionRow, type RoleFormValues } from './role-form.schema';

function normalizeConditions(c: unknown): { key: ConditionKeys; value: string }[] {
  if (!c) return [];
  if (Array.isArray(c)) {
    return c.map((x) => ({
      key: (x as { key: ConditionKeys }).key,
      value: String((x as { value?: string }).value ?? ''),
    }));
  }
  if (typeof c === 'object' && c !== null && 'key' in c) {
    const o = c as { key: ConditionKeys; value: string };
    return [{ key: o.key, value: String(o.value ?? '') }];
  }
  return [];
}

export function roleToFormValues(role: RoleResponse): RoleFormValues {
  return {
    name: role.name,
    permissions:
      role.permissions?.length > 0
        ? role.permissions.map((p) => ({
            action: p.action,
            subject: p.subject,
            conditions: normalizeConditions(p.conditions),
          }))
        : [defaultPermissionRow()],
  };
}

export function formPermissionsToPayload(
  permissions: RoleFormValues['permissions']
): RolePermissionPayload[] {
  return permissions.map((r) => ({
    action: r.action,
    subject: r.subject,
    ...(r.conditions?.length
      ? {
          conditions: r.conditions.map((c) => ({
            key: c.key,
            value: c.value,
          })),
        }
      : {}),
  }));
}
