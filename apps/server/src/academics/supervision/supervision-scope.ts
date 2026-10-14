import { hasAnyRole, hasRole, Roles } from '@darnozom/shared-types';

/** Who may read every evaluation in the organization. */
const ORG_WIDE_EVALUATION_READERS = [Roles.SUPERVISOR, Roles.MANAGER, Roles.OWNER, Roles.ADMIN] as const;

export type EvaluationScope = { kind: 'ORG' } | { kind: 'OWN_TEACHING'; teacherId: string } | { kind: 'NONE' };

/**
 * First matching rule wins. A teacher who also holds SUPERVISOR reads org-wide, which is correct:
 * they hold the supervising role. A teacher who does not reads only evaluations of their own
 * sessions. Everyone else reads nothing — the concept's rule is that accountants cannot see
 * confidential pedagogical notes, and parents and students have no business here at all.
 */
export function resolveEvaluationScope(actor: { _id: string; roleName: Roles; additionalRoles?: readonly Roles[] }): EvaluationScope {
  if (hasAnyRole(actor, ORG_WIDE_EVALUATION_READERS)) return { kind: 'ORG' };
  if (hasRole(actor, Roles.INSTRUCTOR)) return { kind: 'OWN_TEACHING', teacherId: actor._id };
  return { kind: 'NONE' };
}
