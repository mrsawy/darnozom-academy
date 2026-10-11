import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Roles } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import { Course } from 'src/course/entities/course.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';

function isPlatformAdmin(role?: string): boolean {
  return role === Roles.PLATFORM_ADMIN;
}

function isInstructor(role?: string): boolean {
  return role === Roles.INSTRUCTOR;
}

function isStudent(role?: string): boolean {
  return role === Roles.STUDENT;
}

@Injectable()
export class ChatAccessService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<Enrollment>
  ) {}

  /**
   * Asserts that `userId` is allowed to start a 1-on-1 chat with `otherUserId`.
   *
   * Rule: at least one of the two must be an instructor (main or co) on a course
   * the other is enrolled in. Chats between two students or two instructors are rejected.
   * Platform admins can message anyone; anyone can message a platform admin.
   */
  async assertCanChat(userId: string, otherUserId: string): Promise<void> {
    if (userId === otherUserId) {
      throw new ForbiddenException('Cannot start a conversation with yourself');
    }

    const [user, other] = await Promise.all([
      this.userModel.findById(userId).select('roleName').lean(),
      this.userModel.findById(otherUserId).select('roleName').lean(),
    ]);
    if (!user || !other) {
      throw new NotFoundException('User not found');
    }

    if (isPlatformAdmin(user.roleName) || isPlatformAdmin(other.roleName)) {
      return;
    }

    let studentId: string | null = null;
    let instructorId: string | null = null;

    if (isStudent(user.roleName) && isInstructor(other.roleName)) {
      studentId = userId;
      instructorId = otherUserId;
    } else if (isInstructor(user.roleName) && isStudent(other.roleName)) {
      studentId = otherUserId;
      instructorId = userId;
    } else {
      throw new ForbiddenException('Chat is only allowed between a student and one of their course instructors');
    }

    const sharedCourseExists = await this.hasSharedCourse(studentId, instructorId);
    if (!sharedCourseExists) {
      throw new ForbiddenException('You can only message an instructor of a course you are enrolled in');
    }
  }

  /** True if the student has an active enrollment in a course taught by the instructor (main or co). */
  async hasSharedCourse(studentId: string, instructorId: string): Promise<boolean> {
    const instructorObjectId = new Types.ObjectId(instructorId);

    const enrollments = await this.enrollmentModel
      .find({ userId: new Types.ObjectId(studentId) })
      .select('courseId')
      .lean();
    if (enrollments.length === 0) return false;

    const courseIds = enrollments.map((e) => e.courseId);
    const match = await this.courseModel
      .findOne({
        _id: { $in: courseIds },
        $or: [{ instructorId: instructorObjectId }, { coInstructorsIds: instructorObjectId }],
      })
      .select('_id')
      .lean();
    return !!match;
  }
}
