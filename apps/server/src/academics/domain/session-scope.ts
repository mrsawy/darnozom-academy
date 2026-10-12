import { hasAnyRole, Roles } from '@darnozom/shared-types';
import { GroupScope, resolveGroupScope } from './group-scope';

export type SessionScope = Exclude<GroupScope, { kind: 'ORG' }> | { kind: 'ORG'; audience: 'STAFF' | 'ACCOUNTANT' };

/** Org-wide roles that may read pedagogical content. An accountant alone may not. */
const PEDAGOGICAL_ORG_ROLES: readonly Roles[] = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR];

export function resolveSessionScope(actor: { _id: string; roleName: string; additionalRoles?: readonly string[] }): SessionScope {
  const scope = resolveGroupScope(actor);
  if (scope.kind === 'ORG') return { kind: 'ORG', audience: hasAnyRole(actor, PEDAGOGICAL_ORG_ROLES) ? 'STAFF' : 'ACCOUNTANT' };
  return scope;
}
