'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as payrollApi from '@/lib/actions/payroll/payroll.action';
import type {
  AddBonusInput,
  DisputeSessionInput,
  FindStatementsQuery,
  IGroupPayRule,
  IPayrollLookup,
  IPayStatement,
  ITeacherPayProfile,
  MarkPaidInput,
  UpsertGroupPayRuleInput,
  UpsertTeacherPayProfileInput,
} from '@/lib/types/payroll/payroll';

const ROOT = 'payroll';

export const payrollKeys = {
  profiles: [ROOT, 'profiles'] as const,
  profile: (teacherId: string) => [ROOT, 'profiles', teacherId] as const,
  lookup: [ROOT, 'lookup'] as const,
  groupRules: [ROOT, 'group-rules'] as const,
  statements: (query?: FindStatementsQuery) => [ROOT, 'statements', query] as const,
  statement: (id: string) => [ROOT, 'statement', id] as const,
};

export function usePayrollMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  successMessageKey = 'saved'
) {
  const queryClient = useQueryClient();
  const t = useTranslations('Payroll');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(t(successMessageKey));
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}

export const usePayProfiles = (enabled = true) =>
  useQuery({
    queryKey: payrollKeys.profiles,
    queryFn: async (): Promise<ITeacherPayProfile[]> =>
      unwrap(await payrollApi.listTeacherPayProfiles()),
    enabled,
  });

export const usePayProfile = (teacherId: string, enabled = true) =>
  useQuery({
    queryKey: payrollKeys.profile(teacherId),
    queryFn: async (): Promise<ITeacherPayProfile> =>
      unwrap(await payrollApi.getTeacherPayProfile(teacherId)),
    enabled: enabled && Boolean(teacherId),
  });

export const useUpsertPayProfile = () =>
  usePayrollMutation(async (data: UpsertTeacherPayProfileInput) =>
    unwrap(await payrollApi.upsertTeacherPayProfile(data))
  );

export const usePayStatements = (query: FindStatementsQuery = {}, enabled = true) =>
  useQuery({
    queryKey: payrollKeys.statements(query),
    queryFn: async (): Promise<IPayStatement[]> =>
      unwrap(await payrollApi.findPayStatements(query)),
    enabled,
  });

export const usePayStatement = (id: string, enabled = true) =>
  useQuery({
    queryKey: payrollKeys.statement(id),
    queryFn: async (): Promise<IPayStatement> =>
      unwrap(await payrollApi.getPayStatementById(id)),
    enabled: enabled && Boolean(id),
  });

export const useGeneratePayStatements = () =>
  usePayrollMutation(
    async (month: string) => unwrap(await payrollApi.generatePayStatements(month)),
    'generated'
  );

export const useAddBonus = () =>
  usePayrollMutation(
    async (data: AddBonusInput) => unwrap(await payrollApi.addBonusToStatement(data)),
    'bonusAdded'
  );

export const useApprovePayStatement = () =>
  usePayrollMutation(
    async (id: string) => unwrap(await payrollApi.approvePayStatement(id)),
    'approved'
  );

export const useMarkPayStatementPaid = () =>
  usePayrollMutation(
    async (data: MarkPaidInput) => unwrap(await payrollApi.markPayStatementPaid(data)),
    'markedPaid'
  );

export function useDisputeSessionMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations('Payroll');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: async (data: DisputeSessionInput) =>
      unwrap(await payrollApi.disputeSession(data)),
    onSuccess: () => {
      toast.success(t('disputeSaved'));
      void queryClient.invalidateQueries({ queryKey: ['academics', 'sessions'] });
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}

export function useResolveDisputeMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations('Payroll');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: async (sessionId: string) =>
      unwrap(await payrollApi.resolveDispute(sessionId)),
    onSuccess: () => {
      toast.success(t('disputeResolved'));
      void queryClient.invalidateQueries({ queryKey: ['academics', 'sessions'] });
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}

export const usePayrollLookup = (enabled = true) =>
  useQuery({
    queryKey: payrollKeys.lookup,
    queryFn: async (): Promise<IPayrollLookup> => unwrap(await payrollApi.getPayrollLookup()),
    enabled,
  });

export const useGroupPayRules = (enabled = true) =>
  useQuery({
    queryKey: payrollKeys.groupRules,
    queryFn: async (): Promise<IGroupPayRule[]> => unwrap(await payrollApi.listGroupPayRules()),
    enabled,
  });

export const useUpsertGroupPayRule = () =>
  usePayrollMutation(async (data: UpsertGroupPayRuleInput) =>
    unwrap(await payrollApi.upsertGroupPayRule(data))
  );

export const useRemoveGroupPayRule = () =>
  usePayrollMutation(
    async (id: string) => unwrap(await payrollApi.removeGroupPayRule(id)),
    'ruleRemoved'
  );
