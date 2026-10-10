'use server';

import { createAuthorizedNatsRequest, createNatsRequest } from '@/lib/utils/createNatsRequest';

export interface SchoolTypeResponse {
  _id: string;
  nameEn: string;
  nameAr: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSchoolTypePayload {
  nameEn: string;
  nameAr: string;
}

export type UpdateSchoolTypePayload = Partial<CreateSchoolTypePayload>;

export async function getSchoolTypes() {
  return createAuthorizedNatsRequest<SchoolTypeResponse[]>('school-type.findAll', {});
}

export async function getPublicSchoolTypes() {
  return createNatsRequest<SchoolTypeResponse[]>('school-type.findAll', {});
}

export async function getSchoolType(id: string) {
  return createAuthorizedNatsRequest<SchoolTypeResponse>('school-type.findOne', { id });
}

export async function createSchoolType(data: CreateSchoolTypePayload) {
  return createAuthorizedNatsRequest<SchoolTypeResponse>('school-type.create', data);
}

export async function updateSchoolType(id: string, data: UpdateSchoolTypePayload) {
  return createAuthorizedNatsRequest<SchoolTypeResponse>('school-type.update', { id, data });
}

export async function deleteSchoolType(id: string) {
  return createAuthorizedNatsRequest<{ message: string }>('school-type.delete', { id });
}
