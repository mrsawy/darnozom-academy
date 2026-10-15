'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  AddBonusInput,
  DisputeSessionInput,
  FindStatementsQuery,
  IPayStatement,
  ISessionDisputeResult,
  ITeacherPayProfile,
  MarkPaidInput,
  UpsertTeacherPayProfileInput,
} from '@/lib/types/payroll/payroll';

export async function getTeacherPayProfile(teacherId: string) {
  return createAuthorizedNatsRequest<ITeacherPayProfile>('payroll.profiles.get', { teacherId });
}

export async function listTeacherPayProfiles() {
  return createAuthorizedNatsRequest<ITeacherPayProfile[]>('payroll.profiles.list', {});
}

export async function upsertTeacherPayProfile(data: UpsertTeacherPayProfileInput) {
  return createAuthorizedNatsRequest<ITeacherPayProfile>('payroll.profiles.upsert', data);
}

export async function generatePayStatements(month: string) {
  return createAuthorizedNatsRequest<IPayStatement[]>('payroll.statements.generate', { month });
}

export async function findPayStatements(query: FindStatementsQuery = {}) {
  return createAuthorizedNatsRequest<IPayStatement[]>('payroll.statements.find', query);
}

export async function getPayStatementById(id: string) {
  return createAuthorizedNatsRequest<IPayStatement>('payroll.statements.getById', { id });
}

export async function addBonusToStatement(data: AddBonusInput) {
  return createAuthorizedNatsRequest<IPayStatement>('payroll.statements.addBonus', data);
}

export async function approvePayStatement(id: string) {
  return createAuthorizedNatsRequest<IPayStatement>('payroll.statements.approve', { id });
}

export async function markPayStatementPaid(data: MarkPaidInput) {
  return createAuthorizedNatsRequest<IPayStatement>('payroll.statements.markPaid', data);
}

export async function disputeSession(data: DisputeSessionInput) {
  return createAuthorizedNatsRequest<ISessionDisputeResult>('academics.sessions.dispute', data);
}

export async function resolveDispute(sessionId: string) {
  return createAuthorizedNatsRequest<ISessionDisputeResult>('academics.sessions.resolveDispute', { sessionId });
}
