'use server';

import { createAuthorizedNatsRequest, createNatsRequest } from '@/lib/utils/createNatsRequest';

export interface AgeRangeResponse {
  _id: string;
  nameEn: string;
  nameAr: string;
  minAge: number;
  /** null/undefined = open-ended (e.g. 18+). */
  maxAge?: number | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAgeRangePayload {
  nameEn: string;
  nameAr: string;
  minAge: number;
  maxAge?: number | null;
}

export type UpdateAgeRangePayload = Partial<CreateAgeRangePayload>;

export async function getAgeRanges() {
  return createAuthorizedNatsRequest<AgeRangeResponse[]>('age-range.findAll', {});
}

export async function getPublicAgeRanges() {
  return createNatsRequest<AgeRangeResponse[]>('age-range.findAll', {});
}

export async function getAgeRange(id: string) {
  return createAuthorizedNatsRequest<AgeRangeResponse>('age-range.findOne', { id });
}

export async function createAgeRange(data: CreateAgeRangePayload) {
  return createAuthorizedNatsRequest<AgeRangeResponse>('age-range.create', data);
}

export async function updateAgeRange(id: string, data: UpdateAgeRangePayload) {
  return createAuthorizedNatsRequest<AgeRangeResponse>('age-range.update', { id, data });
}

export async function deleteAgeRange(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('age-range.delete', { id });
}

/** For organization staff who manage levels (not platform-admin only). */
export async function createAgeRangeFromLevel(data: CreateAgeRangePayload) {
  return createAuthorizedNatsRequest<AgeRangeResponse>('age-range.createFromLevel', data);
}
