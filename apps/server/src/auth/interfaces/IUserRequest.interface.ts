import { Request } from 'express';
import { UserDocument } from '../../user/entities/user.entity';

export interface IUserRequest extends Request {
  user: UserDocument;
}
