'use server';

import { createAuthorizedNatsRequest, createNatsRequest } from '@/lib/utils/createNatsRequest';

export interface GradeResponse {
  _id: string;
  nameEn: string;
  nameAr: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGradePayload {
  nameEn: string;
  nameAr: string;
}

export type UpdateGradePayload = Partial<CreateGradePayload>;

export async function getGrades() {
  return createAuthorizedNatsRequest<GradeResponse[]>('grade.findAll', {});
}

export async function getPublicGrades() {
  return createNatsRequest<GradeResponse[]>('grade.findAll', {});
}

export async function getGrade(id: string) {
  return createAuthorizedNatsRequest<GradeResponse>('grade.findOne', { id });
}

export async function createGrade(data: CreateGradePayload) {
  return createAuthorizedNatsRequest<GradeResponse>('grade.create', data);
}

export async function updateGrade(id: string, data: UpdateGradePayload) {
  return createAuthorizedNatsRequest<GradeResponse>('grade.update', { id, data });
}

export async function deleteGrade(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('grade.delete', { id });
}
