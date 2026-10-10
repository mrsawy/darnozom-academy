import { IUser } from '../user/user.interface';

export interface RegisterResponse {
  access_token: string;
  refresh_token: string;
  sid: string;
  user: IUser;
  message?: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  sid: string;
  user: IUser;
}
