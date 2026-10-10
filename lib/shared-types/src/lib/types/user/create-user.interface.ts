/**
 * Client-safe shape for CreateUserDto. Use this type in the client;
 * use the class from '@lms-organization/shared-types/dto' on the server.
 */
import type { Roles } from '../role/role/roles.enum';
import type { UserStatus } from './status.enum';
import type { Currency } from '../currency/currency.enum';

export interface CreateUserDto {
  _id?: string;
  username: string;
  walletId?: string;
  roleName: Roles;
  email: string;
  phone?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  profile?: {
    bio?: string;
    avatar?: string;
    dateOfBirth?: Date;
    address?: { detailedAddress?: string; city?: string; state?: string; zipCode?: string; country: string };
    socialLinks?: { linkedin?: string; twitter?: string };
  };
  preferences?: {
    language?: string;
    emailNotifications?: boolean;
    darkMode?: boolean;
  };
  preferredCurrency: Currency;
  authorization?: string;
  status?: UserStatus;
  ParentUser?: string;
  childUsers?: string[];
  authProvider?: 'local' | 'google';
  googleId?: string;
  onboardingComplete?: boolean;
  organizationOnboarded?: boolean;
  parentCreatedByStudent?: boolean;
}
