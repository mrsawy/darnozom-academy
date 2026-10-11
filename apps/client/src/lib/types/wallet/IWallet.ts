import { Currency } from '@darnozom/shared-types';
import { Transaction } from '../transaction/ITransaction.interface';
import { IUser } from '../user/user.interface';

export interface IWallet {
  _id: string;
  userId: string;
  organizationId?: string;
  balance: number;
  currency: Currency;
  isActive: boolean;
  isFrozen: boolean;

  metadata?: Record<string, unknown>;
  transactionsHistory: Transaction[];
  lastTransactionDate?: string;

  // Virtuals
  user?: IUser;
  // organization?: IOrganization;
  // transactionsHistory?: ITransaction[];

  createdAt?: Date;
  updatedAt?: Date;
}
