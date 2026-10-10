import { Wishlist } from '../entities/wishlist.entity';
import { Course } from 'src/course/entities/course.entity';
import { User } from 'src/user/entities/user.entity';

// Type for Wishlist with populated course and user
export type WishlistWithPopulated = Wishlist & {
  course?: Course;
  user?: Pick<User, '_id' | 'firstName' | 'lastName' | 'email'>;
};
