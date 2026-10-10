import { Model, Types } from 'mongoose';
import { Wishlist } from '../entities/wishlist.entity';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../user/entities/user.entity';
import { fakerAR as faker } from '@faker-js/faker';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';

export class WishlistSeeder {
  constructor(
    private readonly wishlistModel: Model<Wishlist>,
    private readonly courseModel: Model<Course>,
    private readonly userModel: Model<User>,
    private readonly enrollmentModel: Model<Enrollment>
  ) {}

  /**
   * Seed a wishlist item for a user and course
   */
  async seedWishlistItem(userId: Types.ObjectId, courseId: Types.ObjectId, overrides: Partial<Wishlist> = {}) {
    // Check if wishlist item already exists
    const existingWishlist = await this.wishlistModel.findOne({
      userId,
      courseId,
    });

    if (existingWishlist) {
      // If exists but inactive, reactivate it
      if (!existingWishlist.isActive) {
        existingWishlist.isActive = true;
        return await existingWishlist.save();
      }
      return existingWishlist;
    }
    // Check if student is already enrolled in the course
    const existingEnrollment = await this.enrollmentModel.findOne({
      userId,
      courseId,
    });
    if (existingEnrollment) {
      return null;
    }

    const wishlistData: Partial<Wishlist> = {
      userId,
      courseId,
      isActive: overrides.isActive ?? true,
      ...overrides,
    };

    return await this.wishlistModel.create(wishlistData);
  }

  /**
   * Seed wishlist items for students
   * Each student will have 2-5 random courses in their wishlist
   */
  async seedWishlistsForStudents(students: User[], courses: Course[]) {
    if (students.length === 0) {
      // eslint-disable-next-line no-console
      console.log('  No students available for seeding wishlists');
      return;
    }

    if (courses.length === 0) {
      // eslint-disable-next-line no-console
      console.log('  No courses available for seeding wishlists');
      return;
    }

    let totalWishlistsCreated = 0;

    for (const student of students) {
      // Each student gets 2-5 random courses in their wishlist
      const wishlistCount = faker.number.int({ min: 2, max: 5 });
      const selectedCourses = faker.helpers.arrayElements(courses, Math.min(wishlistCount, courses.length));

      for (const course of selectedCourses) {
        // Skip if student is already enrolled in the course
        const existingEnrollment = await this.enrollmentModel.findOne({
          userId: student._id,
          courseId: course._id,
        });
        if (existingEnrollment) {
          continue;
        }
        const wishlist = await this.seedWishlistItem(student._id, course._id);
        if (wishlist) {
          totalWishlistsCreated++;
        }
      }
    }

    // eslint-disable-next-line no-console
    console.log(`  Wishlist seeding complete: ${totalWishlistsCreated} wishlist items created`);
  }

  /**
   * Seed wishlist items for a specific user
   */
  async seedWishlistsForUser(userId: Types.ObjectId, courses: Course[], count = 3) {
    if (courses.length === 0) {
      return [];
    }

    const selectedCourses = faker.helpers.arrayElements(courses, Math.min(count, courses.length));

    const wishlists: Wishlist[] = [];
    for (const course of selectedCourses) {
      const wishlist = await this.seedWishlistItem(userId, course._id);
      if (wishlist) {
        wishlists.push(wishlist);
      }
    }

    return wishlists;
  }

  /**
   * Seed wishlist items for courses (multiple users wishlisting the same course)
   */
  async seedWishlistsForCourse(courseId: Types.ObjectId, users: User[], count = 5) {
    if (users.length === 0) {
      return [];
    }

    const selectedUsers = faker.helpers.arrayElements(users, Math.min(count, users.length));

    const wishlists: Wishlist[] = [];
    for (const user of selectedUsers) {
      const wishlist = await this.seedWishlistItem(user._id, courseId);
      if (wishlist) {
        wishlists.push(wishlist);
      }
    }

    return wishlists;
  }
}
