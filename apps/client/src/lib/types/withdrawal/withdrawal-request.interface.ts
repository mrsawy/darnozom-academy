import { WithdrawalMethod, WithdrawalRequestStatus } from '@darnozom/shared-types';
import { IUser } from '../user/user.interface';

export interface MobileWalletDetails {
  phoneNumber: string;
  providerName: string;
}

export interface BankTransferDetails {
  iban: string;
  bankName: string;
  accountHolderName: string;
}

export interface CreditCardDetails {
  cardHolderName: string;
  cardLastFour: string;
}

export type WithdrawalMethodDetails = MobileWalletDetails | BankTransferDetails | CreditCardDetails;

export interface IWithdrawalRequest {
  _id: string;
  userId: string;
  walletId: string;
  amount: number;
  currency: string;
  method: WithdrawalMethod;
  methodDetails: WithdrawalMethodDetails;
  status: WithdrawalRequestStatus;
  userNote?: string;
  adminNote?: string;
  proofImageKeys: string[];
  proofImageUrls?: string[];
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Populated virtuals
  user?: IUser;
}

export interface CreateWithdrawalRequestPayload {
  amount: number;
  currency: string;
  method: WithdrawalMethod;
  methodDetails: WithdrawalMethodDetails;
  userNote?: string;
}

export interface UpdateWithdrawalRequestPayload {
  method?: WithdrawalMethod;
  methodDetails?: WithdrawalMethodDetails;
  userNote?: string;
}

export interface ProcessWithdrawalRequestPayload {
  status: WithdrawalRequestStatus.APPROVED | WithdrawalRequestStatus.REJECTED;
  adminNote?: string;
  proofImageKeys?: string[];
}

export interface WithdrawalRequestsPage {
  docs: IWithdrawalRequest[];
  total: number;
}
