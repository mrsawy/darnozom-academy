import { Roles } from '../role/role/roles.enum';
import { UserStatus } from './status.enum';

export interface ICreateUser {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  password?: string;
  roleName: Roles;
  organizationId?: string;
  status?: UserStatus;
  onboardingComplete?: boolean;
  authProvider?: 'local' | 'google';
}
