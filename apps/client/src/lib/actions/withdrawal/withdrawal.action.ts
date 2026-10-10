'use server';

import { createAuthorizedNatsRequest, type NatsErr } from '@/lib/utils/createNatsRequest';
import {
  IWithdrawalRequest,
  WithdrawalRequestsPage,
  CreateWithdrawalRequestPayload,
  UpdateWithdrawalRequestPayload,
  ProcessWithdrawalRequestPayload,
} from '@/lib/types/withdrawal/withdrawal-request.interface';
import { WithdrawalRequestStatus } from '@lms-organization/shared-types';

export async function createWithdrawalRequest(data: CreateWithdrawalRequestPayload) {
  return createAuthorizedNatsRequest<IWithdrawalRequest>('withdrawal.create', data);
}

export async function getMyWithdrawalRequests(page = 1, limit = 10) {
  return createAuthorizedNatsRequest<WithdrawalRequestsPage>('withdrawal.findMyRequests', {
    page,
    limit,
  });
}

export async function getWithdrawalRequest(id: string): Promise<IWithdrawalRequest | NatsErr> {
  return createAuthorizedNatsRequest<IWithdrawalRequest>('withdrawal.findOne', { id });
}

export async function updateWithdrawalRequest(id: string, data: UpdateWithdrawalRequestPayload) {
  return createAuthorizedNatsRequest<IWithdrawalRequest>('withdrawal.update', {
    id,
    ...data,
  });
}

export async function cancelWithdrawalRequest(id: string): Promise<IWithdrawalRequest | NatsErr> {
  return createAuthorizedNatsRequest<IWithdrawalRequest>('withdrawal.cancel', { id });
}

export async function getAllWithdrawalRequests(
  page = 1,
  limit = 10,
  status?: WithdrawalRequestStatus
) {
  return createAuthorizedNatsRequest<WithdrawalRequestsPage>('withdrawal.findAll', {
    page,
    limit,
    status,
  });
}

export async function processWithdrawalRequest(id: string, data: ProcessWithdrawalRequestPayload) {
  return createAuthorizedNatsRequest<IWithdrawalRequest>('withdrawal.process', {
    id,
    ...data,
  });
}
