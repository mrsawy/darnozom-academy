export const SESSION_COMPLETED_EVENT = 'academics.session.completed';

export interface SessionCompletedPayload {
  sessionId: string;
  groupId: string;
  organizationId: string;
}
