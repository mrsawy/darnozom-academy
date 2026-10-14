import {
  hasRole,
  Roles,
  SESSION_SCORE_MAX,
  SESSION_SCORE_MIN,
  SessionStatus,
  SUPERVISION_CRITERIA,
  SUPERVISION_EDIT_WINDOW_HOURS,
} from '@darnozom/shared-types';

/**
 * A session can be evaluated once it has actually been held. REPORT_PENDING and COMPLETED both
 * mean the clock ran out on a scheduled session; CANCELLED means it never happened, so there is
 * nothing to judge.
 */
export function isHeldSession(status: SessionStatus): boolean {
  return status === SessionStatus.REPORT_PENDING || status === SessionStatus.COMPLETED;
}

/**
 * All five criteria, each a whole number on the shared scale. Nothing is defaulted and nothing is
 * coerced: a rounded or guessed score is a fabricated judgment about a teacher's work.
 */
export function areScoresValid(input: Record<string, unknown>): boolean {
  return SUPERVISION_CRITERIA.every((criterion) => {
    const value = input[criterion];
    return typeof value === 'number' && Number.isInteger(value) && value >= SESSION_SCORE_MIN && value <= SESSION_SCORE_MAX;
  });
}

interface EvaluatorActor {
  _id: string;
  roleName: Roles;
  additionalRoles?: readonly Roles[];
}

/** The group's own supervisor, or anyone who manages the organization. */
export function canEvaluate(actor: EvaluatorActor, group: { supervisorId: unknown }): boolean {
  if (hasRole(actor, Roles.MANAGER) || hasRole(actor, Roles.OWNER)) return true;
  if (group.supervisorId == null) return false;
  return hasRole(actor, Roles.SUPERVISOR) && String(group.supervisorId) === actor._id;
}

/** Hours, not calendar days, so a daylight-saving shift cannot move the deadline (plan decision D2). */
export function isWithinEditWindow(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() < SUPERVISION_EDIT_WINDOW_HOURS * 3600 * 1000;
}
