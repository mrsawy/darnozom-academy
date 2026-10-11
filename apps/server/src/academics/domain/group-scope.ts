import { hasAnyRole, hasRole, ORG_WIDE_GROUP_READER_ROLES, Roles } from '@darnozom/shared-types';

export type GroupScope =
  | { kind: 'ORG' }
  | { kind: 'TEACHER'; teacherId: string }
  | { kind: 'PARENT'; parentId: string }
  | { kind: 'STUDENT'; studentId: string }
  | { kind: 'NONE' };

/** First matching rule wins: org-wide staff, then teacher, parent, student. */
export function resolveGroupScope(actor: { _id: string; roleName: string; additionalRoles?: readonly string[] }): GroupScope {
  if (hasAnyRole(actor, ORG_WIDE_GROUP_READER_ROLES)) return { kind: 'ORG' };
  if (hasRole(actor, Roles.INSTRUCTOR)) return { kind: 'TEACHER', teacherId: actor._id };
  if (hasRole(actor, Roles.PARENT)) return { kind: 'PARENT', parentId: actor._id };
  if (hasRole(actor, Roles.STUDENT)) return { kind: 'STUDENT', studentId: actor._id };
  return { kind: 'NONE' };
}
