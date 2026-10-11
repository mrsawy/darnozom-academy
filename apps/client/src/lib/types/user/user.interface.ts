import { Currency, Roles, UserStatus, IPermission } from '@darnozom/shared-types';
import { Organization } from '../organization/organization.interface';
import { ICategory } from '../category/ICategory';

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
  other?: string;
}

export interface Profile {
  bio?: string;
  avatar?: string;
  dateOfBirth?: Date;
  address?: Address;
  socialLinks?: SocialLinks;
  shortBio?: string;
}

export interface Preferences {
  language?: string;
  emailNotifications?: boolean;
  darkMode?: boolean;
}

export interface Role {
  _id: string;
  name: Roles;
  permissions: { action: string; subject: string }[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IUser {
  _id: string;
  organizationId?: string;

  username: string;
  email: string;
  /** Optional: GUEST (pre-onboarding) users may not have a phone yet. */
  phone?: string;
  password?: string;

  firstName: string;
  lastName: string;
  roleName: Roles;
  /** False until the user finishes post-OAuth onboarding (role, phone, org). */
  onboardingComplete?: boolean;
  /** False until the SuperAdmin finishes the organization product tour. */
  organizationOnboarded?: boolean;
  /** Optional: GUEST users may have an empty permissions set before onboarding. */
  ability?: IPermission[];

  profile?: Profile;
  preferences?: Preferences;

  status?: UserStatus;
  lastLogin?: Date;

  walletId?: string;
  preferredCurrency: Currency; // e.g. 'USD' | 'EUR' | etc.

  createdAt?: Date;
  updatedAt?: Date;
  organization?: Organization;
  role: Role;
}

export interface IInstructor extends IUser {
  roleName: typeof Roles.INSTRUCTOR;
  organizationId: string;
  totalStudents?: number;
  totalCourses?: number;
  averageRating?: number;
  totalRatings?: number;
  totalCoursesReviews?: number;
  averageCoursesRating?: number;
  categoriesIds?: string[];
  categories?: Pick<ICategory, '_id' | 'name'>[];
  gradesIds?: string[];
  grades?: { _id: string; nameEn: string; nameAr: string }[];
  schoolTypesIds?: string[];
  schoolTypes?: { _id: string; nameEn: string; nameAr: string }[];
}

export interface IParent extends IUser {
  roleName: typeof Roles.PARENT;
  childUsersIds?: string[];
  childUsers?: IUser[];
}

export interface IStudent extends IUser {
  roleName: typeof Roles.STUDENT;
  parentUserId?: string;
  parentUser?: IUser;
}
