'use server';

import { createAuthorizedNatsRequest, createNatsRequest } from '@/lib/utils/createNatsRequest';

export interface PlanPriceDetails {
  originalPrice: number;
  originalCurrency: string;
  priceUSD: number;
}

export interface PlanPrice {
  MONTHLY: PlanPriceDetails;
  YEARLY: PlanPriceDetails;
  ONE_TIME: PlanPriceDetails;
}

export interface PlanFeatures {
  usersPerSubscription: number;
  coursesPerSubscription: number;
  parentAccountsPerSubscription: number;
  pagesPerSubscription: number;
  liveSessionsPerMonth: number;
  assignmentsPerMonth: number;
  maxStorageGB: number;
  courseAnalytics: boolean;
  contentAnalytics: boolean;
  moduleAnalytics: boolean;
  trackingStudentProgress: boolean;
  prioritySupport: boolean;
  accessStudentsInfo: boolean;
  certificates: boolean;
  customBranding: boolean;
  inAppChat: boolean;
  liveSessions: boolean;
  quizzes: boolean;
  assignments: boolean;
  bulkExport: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
  customDomain: boolean;
  sso: boolean;
  attendanceTracking: boolean;
  dripContent: boolean;
  gamification: boolean;
  webhooks: boolean;
  reporting: boolean;
  courseTemplates: boolean;
  multiLanguage: boolean;
}

export interface PlanLemonSqueezyVariantIds {
  MONTHLY?: string;
  YEARLY?: string;
}

export interface PlanPaddlePriceIds {
  MONTHLY?: string;
  YEARLY?: string;
}

export interface PlanResponse {
  _id: string;
  name: string;
  description: string;
  price: PlanPrice;
  tier: string;
  features: PlanFeatures;
  isActive: boolean;
  /** Platform tax percentage (0–100) deducted from enrollments before crediting the org wallet. */
  taxPercentage?: number;
  planId?: string;
  lemonSqueezyVariantIds?: PlanLemonSqueezyVariantIds;
  paddlePriceIds?: PlanPaddlePriceIds;
  createdAt?: string;
  updatedAt?: string;
}

export type CreatePlanPayload = Omit<PlanResponse, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdatePlanPayload = Partial<CreatePlanPayload>;

export async function getPlans() {
  return createAuthorizedNatsRequest<PlanResponse[]>('plan.findAll', {});
}

export async function getPublicPlans() {
  return createNatsRequest<PlanResponse[]>('plan.findAll', {});
}

export async function getPlan(id: string) {
  return createAuthorizedNatsRequest<PlanResponse>('plan.findOne', { id });
}

export async function createPlan(data: CreatePlanPayload) {
  return createAuthorizedNatsRequest<PlanResponse>('plan.create', data);
}

export async function updatePlan(id: string, data: UpdatePlanPayload) {
  return createAuthorizedNatsRequest<PlanResponse>('plan.update', { id, data });
}

export async function deletePlan(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('plan.delete', { id });
}
