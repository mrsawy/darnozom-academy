'use client';

import { toast } from 'react-toastify';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@/lib/utils';
import { translateApiMessage } from '@/lib/utils/errors/translateApiMessage';
import { unwrap } from '@/lib/utils/academics/unwrap';
import * as certApi from '@/lib/actions/certificate/certificate.action';
import type {
  GetCertificatesFilterDto,
  ICertificate,
  PublicCertificateVerification,
  UpdateCertificateNameDto,
  FinalResult,
} from '@/lib/types/certificate/certificate';

const ROOT = 'certificates';

export const certificateKeys = {
  all: [ROOT] as const,
  list: (filter?: GetCertificatesFilterDto) => [ROOT, 'list', filter] as const,
  detail: (id: string) => [ROOT, 'detail', id] as const,
  verify: (token: string) => [ROOT, 'verify', token] as const,
};

export function useCertificateMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  successMessageKey = 'saved',
) {
  const queryClient = useQueryClient();
  const t = useTranslations('Certificates');
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

export const useCertificates = (filter?: GetCertificatesFilterDto, enabled = true) =>
  useQuery({
    queryKey: certificateKeys.list(filter),
    queryFn: async (): Promise<ICertificate[]> =>
      unwrap(await certApi.getCertificates(filter)),
    enabled,
  });

export const useCertificate = (id: string, enabled = true) =>
  useQuery({
    queryKey: certificateKeys.detail(id),
    queryFn: async (): Promise<ICertificate> =>
      unwrap(await certApi.getCertificateById(id)),
    enabled: enabled && Boolean(id),
  });

export const useVerifyCertificate = (token: string, enabled = true) =>
  useQuery({
    queryKey: certificateKeys.verify(token),
    queryFn: async (): Promise<PublicCertificateVerification> =>
      unwrap(await certApi.verifyCertificatePublic(token)),
    enabled: enabled && Boolean(token),
  });

export const useEvaluateCertificates = () =>
  useCertificateMutation(
    async (groupId: string) => unwrap(await certApi.evaluateGroupCertificates(groupId)),
    'evaluated',
  );

export const useUpdateCertificateName = () =>
  useCertificateMutation(
    async ({ id, data }: { id: string; data: UpdateCertificateNameDto }) =>
      unwrap(await certApi.updateCertificateName(id, data)),
    'nameUpdated',
  );

export const useConfirmCertificateName = () =>
  useCertificateMutation(
    async (id: string) => unwrap(await certApi.confirmCertificateName(id)),
    'nameConfirmed',
  );

export const useIssueCertificate = () =>
  useCertificateMutation(
    async (id: string) => unwrap(await certApi.issueCertificate(id)),
    'issued',
  );

export function useSetFinalResultMutation() {
  const queryClient = useQueryClient();
  const t = useTranslations('Certificates');
  const tErrors = useTranslations('errors');
  return useMutation({
    mutationFn: async ({
      groupId,
      studentId,
      finalResult,
    }: {
      groupId: string;
      studentId: string;
      finalResult: FinalResult;
    }) => unwrap(await certApi.setStudentFinalResult(groupId, studentId, finalResult)),
    onSuccess: () => {
      toast.success(t('finalResultSaved'));
      void queryClient.invalidateQueries({ queryKey: ['academics', 'groups'] });
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
    onError: (error: Error) => {
      toast.error(translateApiMessage(error.message, tErrors));
    },
  });
}
