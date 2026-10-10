import { ICourse } from '../course/course.interface';
import { IUser } from '../user/user.interface';

export interface IWishlist {
  _id: string;
  userId: string;
  courseId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  course?: ICourse;
  user?: IUser;
}

export interface CreateWishlistDto {
  courseId: string;
}

export interface GetWishlistDto {
  courseId?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
}
