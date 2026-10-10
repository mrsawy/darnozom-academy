'use server';

import { createAuthorizedNatsRequest, createNatsRequest } from '@/lib/utils/createNatsRequest';

export interface AiPlanPriceDetails {
  originalPrice: number;
  originalCurrency: string;
  priceUSD: number;
}

export interface AiPlanPrice {
  MONTHLY: AiPlanPriceDetails;
  YEARLY: AiPlanPriceDetails;
  ONE_TIME: AiPlanPriceDetails;
}

export interface AiPlanFeatures {
  /** Messages allowed per day. -1 = unlimited. */
  messagesPerDay: number;
  aiAssistant: boolean;
}

export interface AiPlanResponse {
  _id: string;
  name: string;
  description: string;
  tier: string;
  features: AiPlanFeatures;
  price: AiPlanPrice;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateAiPlanPayload = Omit<AiPlanResponse, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateAiPlanPayload = Partial<CreateAiPlanPayload>;

export async function getAiPlans() {
  return createAuthorizedNatsRequest<AiPlanResponse[]>('ai-plan.findAll', {});
}

/** Fetches only active AI plans — no auth required. Used by the public /ai-pricing page. */
export async function getPublicAiPlans() {
  return createNatsRequest<AiPlanResponse[]>('ai-plan.findAllPublic', {});
}

export async function getAiPlan(id: string) {
  return createAuthorizedNatsRequest<AiPlanResponse>('ai-plan.findOne', { id });
}

export async function createAiPlan(data: CreateAiPlanPayload) {
  return createAuthorizedNatsRequest<AiPlanResponse>('ai-plan.create', data);
}

export async function updateAiPlan(id: string, data: UpdateAiPlanPayload) {
  return createAuthorizedNatsRequest<AiPlanResponse>('ai-plan.update', { id, data });
}

export async function deleteAiPlan(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('ai-plan.delete', { id });
}
