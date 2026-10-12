'use server';

import type { FollowUpDecision } from '@darnozom/shared-types';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type { IFollowUp, IFollowUps } from '@/lib/types/academics/academics';

export async function getFollowUps(groupId: string) {
  return createAuthorizedNatsRequest<IFollowUps>('academics.followUps.list', { id: groupId });
}
export async function updateFollowUp(
  id: string,
  data: { parentFeedback?: string; decision?: FollowUpDecision }
) {
  return createAuthorizedNatsRequest<IFollowUp>('academics.followUps.update', { id, data });
}
