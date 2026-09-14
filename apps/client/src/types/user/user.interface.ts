import { IOrganization, IPermission, Roles, UserStatus } from '@islamic-academy/shared-types';

export interface Profile {
  bio?: string;
  avatar?: string;
  dateOfBirth?: Date;
}

export interface IUser {
  _id: string;
  organizationId?: string;

  username: string;
  email: string;
  /** Optional: GUEST (pre-onboarding) users may not have a phone yet. */
  phone?: string;

  firstName: string;
  lastName: string;
  roleName: Roles;
  /** False until the user finishes post-OAuth onboarding (role, phone, org). */
  onboardingComplete?: boolean;
  /** Optional: GUEST users may have an empty permissions set before onboarding. */
  ability?: IPermission[];

  profile?: Profile;
  status?: UserStatus;

  createdAt?: Date;
  updatedAt?: Date;
  organization?: IOrganization;
}
