import { Roles } from '@lms-organization/shared-types';
import { IUser } from '../user/user.interface';

export interface RegisterResponse {
  access_token: string;
  refresh_token: string;
  sid: string;
  user: IUser;
}

export type RefreshResponse = RegisterResponse;

export interface ApiErr {
  err: { message: string };
}

/** Body shape the server's `POST /auth/register` (RegisterDto) actually expects. */
export interface RegisterRequestBody {
  userDto: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    phone?: string;
    password?: string;
    roleName: Roles;
  };
  organizationDto?: {
    name: string;
    slug: string;
  };
  acceptedTerms?: boolean;
}
