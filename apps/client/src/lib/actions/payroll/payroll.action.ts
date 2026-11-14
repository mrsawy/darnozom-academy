'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import type {
  AddBonusInput,
  DisputeSessionInput,
  FindStatementsQuery,
  IGroupPayRule,
  IPayrollLookup,
  IPayStatement,
  ISessionDisputeResult,
  ITeacherPayProfile,
  MarkPaidInput,
  UpsertGroupPayRuleInput,
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

export async function getPayrollLookup() {
  return createAuthorizedNatsRequest<IPayrollLookup>('payroll.lookup', {});
}

export async function listGroupPayRules() {
  return createAuthorizedNatsRequest<IGroupPayRule[]>('payroll.groupRules.list', {});
}

export async function upsertGroupPayRule(data: UpsertGroupPayRuleInput) {
  return createAuthorizedNatsRequest<IGroupPayRule>('payroll.groupRules.upsert', data);
}

export async function removeGroupPayRule(id: string) {
  return createAuthorizedNatsRequest<IGroupPayRule>('payroll.groupRules.remove', { id });
}
