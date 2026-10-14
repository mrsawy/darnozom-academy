'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  EvaluationQuery,
  ISupervisionEvaluation,
  SupervisionScores,
} from '@/lib/types/academics/academics';

export async function getEvaluations(query: EvaluationQuery) {
  return createAuthorizedNatsRequest<ISupervisionEvaluation[]>('academics.supervision.list', query);
}

export async function getSessionEvaluations(sessionId: string) {
  return createAuthorizedNatsRequest<ISupervisionEvaluation[]>(
    'academics.supervision.listForSession',
    { id: sessionId }
  );
}

export async function createEvaluation(sessionId: string, data: SupervisionScores) {
  return createAuthorizedNatsRequest<ISupervisionEvaluation>('academics.supervision.create', {
    sessionId,
    ...data,
  });
}

export async function updateEvaluation(id: string, data: SupervisionScores) {
  return createAuthorizedNatsRequest<ISupervisionEvaluation>('academics.supervision.update', {
    id,
    data,
  });
}
