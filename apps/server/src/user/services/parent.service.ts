import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, PaginateModel } from 'mongoose';
import { ParentErrors, Roles, UserStatus, Currency } from '@lms-organization/shared-types';
import { User } from '../entities/user.entity';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { Course } from 'src/course/entities/course.entity';
import { CourseModuleEntity } from 'src/course/entities/course-module.entity';
import { CourseContent } from 'src/course/entities/course-content.entity';
import {
  RelatedStudentEnrollmentDetails,
  ParentProgressFilters,
  RelatedStudentProgress,
  StudentProgressEnrollment,
  StudentProgressSummary,
} from '../types/parent-progress.type';
import { CreateChildDto } from '../dto/create-child.dto';
import { UpdateChildDto } from '../dto/update-child.dto';
import { CreateParentForStudentDto } from '../dto/create-parent-for-student.dto';
import { UserService } from './user.service';
import { WalletService } from 'src/wallet/wallet.service';

type EnrollmentProgress = RelatedStudentEnrollmentDetails['enrollment']['progress'];

const CHILD_SUMMARY_SELECT = '_id firstName lastName username email phone status roleName passwordLastUpdated';
const PARENT_INFO_SELECT = '_id email username passwordLastUpdated parentCreatedByStudent';

@Injectable()
export class ParentService {
  constructor(
    @InjectModel(User.name) private readonly userModel: PaginateModel<User>,
    @InjectModel(Enrollment.name)
    private readonly enrollmentModel: PaginateModel<Enrollment>,
    @InjectModel(Course.name) private readonly courseModel: PaginateModel<Course>,
    @InjectModel(CourseModuleEntity.name)
    private readonly courseModuleModel: PaginateModel<CourseModuleEntity>,
    @InjectModel(CourseContent.name)
    private readonly courseContentModel: PaginateModel<CourseContent>,
    private readonly userService: UserService,
    private readonly walletService: WalletService
  ) {}

  async createChildStudent(parentId: mongoose.Types.ObjectId, dto: CreateChildDto, session?: ClientSession): Promise<User> {
    const parent = await this.userModel.findOne({ _id: parentId, roleName: Roles.PARENT }).lean();
    if (!parent) throw new NotFoundException(ParentErrors.PARENT_NOT_FOUND);

    const childId = new mongoose.Types.ObjectId();
    const walletId = new mongoose.Types.ObjectId();

    const child = await this.userService.create(
      {
        _id: childId,
        walletId,
        username: dto.username,
        email: dto.email,
        phone: dto.phone,
        password: dto.password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleName: Roles.STUDENT,
        preferredCurrency: Currency.USD,
        status: UserStatus.ACTIVE,
        parentUserId: parentId,
        profile: { address: { country: dto.country } },
        passwordLastUpdated: null,
      },
      session
    );

    await this.walletService.create({ _id: walletId, userId: childId, currency: Currency.USD }, session);

    await this.userModel.updateOne({ _id: parentId }, { $addToSet: { childUsersIds: childId } }, { session });

    return child;
  }

  async createParentForStudent(studentId: mongoose.Types.ObjectId, dto: CreateParentForStudentDto): Promise<void> {
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      const student = await this.userModel.findOne({ _id: studentId, roleName: Roles.STUDENT }).lean();
      if (!student) throw new NotFoundException(ParentErrors.CHILD_NOT_FOUND);
      if (student.parentUserId) throw new BadRequestException(ParentErrors.STUDENT_ALREADY_HAS_PARENT);

      const parentId = new mongoose.Types.ObjectId();
      const walletId = new mongoose.Types.ObjectId();

      await this.userService.create(
        {
          _id: parentId,
          walletId,
          username: dto.username,
          email: dto.email,
          phone: dto.phone,
          password: dto.password,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roleName: Roles.PARENT,
          preferredCurrency: Currency.USD,
          status: UserStatus.ACTIVE,
          childUsersIds: [studentId],
          profile: { address: { country: dto.country } },
          passwordLastUpdated: null,
          onboardingComplete: true,
          authProvider: 'local',
          parentCreatedByStudent: true,
        },
        session
      );

      await this.walletService.create({ _id: walletId, userId: parentId, currency: Currency.USD }, session);

      await this.userModel.updateOne({ _id: studentId }, { $set: { parentUserId: parentId } }, { session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async getChildren(parentId: mongoose.Types.ObjectId): Promise<User[]> {
    const parent = await this.userModel
      .findOne({ _id: parentId, roleName: Roles.PARENT })
      .populate<{ childUsers: User[] }>({ path: 'childUsers', select: CHILD_SUMMARY_SELECT })
      .lean();

    if (!parent) throw new NotFoundException(ParentErrors.PARENT_NOT_FOUND);

    return (parent.childUsers ?? []) as User[];
  }

  async updateChild(parentId: mongoose.Types.ObjectId, childId: mongoose.Types.ObjectId, dto: UpdateChildDto): Promise<void> {
    const parent = await this.userModel.findOne({ _id: parentId, roleName: Roles.PARENT }).lean();
    if (!parent) throw new NotFoundException(ParentErrors.PARENT_NOT_FOUND);

    const parentChildIds = Array.isArray(parent.childUsersIds) ? parent.childUsersIds.map((id) => id.toString()) : [];
    if (!parentChildIds.includes(childId.toString())) {
      throw new ForbiddenException(ParentErrors.CHILD_NOT_LINKED);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.country !== undefined) updateData['profile.address.country'] = dto.country;

    await this.userService.update(
      { _id: childId, roleName: Roles.STUDENT },
      updateData as import('@lms-organization/shared-types/dto').UpdateUserDto
    );
  }

  async getLinkedParentInfo(studentId: mongoose.Types.ObjectId): Promise<{
    _id: mongoose.Types.ObjectId;
    email: string;
    username: string;
    passwordLastUpdated: Date | null;
    parentCreatedByStudent?: boolean;
  } | null> {
    const student = await this.userModel.findOne({ _id: studentId, roleName: Roles.STUDENT }).lean();
    if (!student) throw new NotFoundException(ParentErrors.CHILD_NOT_FOUND);

    if (!student.parentUserId) return null;

    const parent = await this.userModel.findOne({ _id: student.parentUserId, roleName: Roles.PARENT }).select(PARENT_INFO_SELECT).lean();

    if (!parent) return null;

    const p = parent as unknown as User & { passwordLastUpdated?: Date | null; parentCreatedByStudent?: boolean };

    return {
      _id: parent._id,
      email: parent.email,
      username: parent.username,
      passwordLastUpdated: p.passwordLastUpdated ?? null,
      parentCreatedByStudent: Boolean(p.parentCreatedByStudent),
    };
  }

  async validateParentChildLink(parentId: mongoose.Types.ObjectId, childId: mongoose.Types.ObjectId): Promise<void> {
    const parent = await this.userModel.findOne({ _id: parentId, roleName: Roles.PARENT }).lean();
    if (!parent) throw new NotFoundException(ParentErrors.PARENT_NOT_FOUND);

    const parentChildIds = Array.isArray(parent.childUsersIds) ? parent.childUsersIds.map((id) => id.toString()) : [];
    if (!parentChildIds.includes(childId.toString())) {
      throw new ForbiddenException(ParentErrors.CHILD_NOT_LINKED);
    }
  }

  /** Parent fields needed (id + refs for populate / link check) */
  private static readonly PARENT_SELECT = '_id childUsersIds';

  /** Student fields for progress response + role filter (populated children) */
  private static readonly STUDENT_SELECT = '_id firstName lastName username email phone roleName';

  /** Student fields when we need link check (includes ParentUser) */
  private static readonly STUDENT_LINK_SELECT = '_id firstName lastName username email phone ParentUser roleName';

  async getRelatedStudentsProgress(
    parentId: mongoose.Types.ObjectId,
    organizationId?: mongoose.Types.ObjectId,
    filters?: ParentProgressFilters
  ): Promise<RelatedStudentProgress[]> {
    const parent = await this.userModel
      .findOne({
        _id: parentId,
        roleName: Roles.PARENT,
        ...(organizationId ? { organizationId } : {}),
      })
      .select(ParentService.PARENT_SELECT)
      .populate<{ childUsers: User[] }>('childUsers', ParentService.STUDENT_SELECT)
      .exec();

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const students = parent.childUsers?.filter((u) => u.roleName === Roles.STUDENT) ?? [];
    if (students.length === 0) {
      return [];
    }

    return await this.buildStudentsProgress(students, organizationId, filters);
  }

  async getSingleRelatedStudentProgress(
    parentId: mongoose.Types.ObjectId,
    studentId: mongoose.Types.ObjectId,
    organizationId?: mongoose.Types.ObjectId,
    filters?: ParentProgressFilters
  ): Promise<RelatedStudentProgress> {
    const [parent, student] = await Promise.all([
      this.userModel
        .findOne({
          _id: parentId,
          roleName: Roles.PARENT,
          ...(organizationId ? { organizationId } : {}),
        })
        .select(ParentService.PARENT_SELECT)
        .lean(),
      this.userModel
        .findOne({
          _id: studentId,
          roleName: Roles.STUDENT,
          ...(organizationId ? { organizationId } : {}),
        })
        .select(ParentService.STUDENT_LINK_SELECT)
        .lean(),
    ]);

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const linkedByParentUser = (student as unknown as User & { ParentUser?: mongoose.Types.ObjectId }).ParentUser?.toString() === parentId.toString();
    const parentChildIds = Array.isArray(parent.childUsersIds) ? parent.childUsersIds.map((id) => id.toString()) : [];
    const linkedByChildUsers = parentChildIds.includes(studentId.toString());

    if (!linkedByParentUser && !linkedByChildUsers) {
      throw new ForbiddenException('Student is not related to this parent');
    }

    const results = await this.buildStudentsProgress([student as unknown as User], organizationId, filters);
    return results[0];
  }

  async getRelatedStudentEnrollmentDetails(
    parentId: mongoose.Types.ObjectId,
    enrollmentId: mongoose.Types.ObjectId,
    organizationId?: mongoose.Types.ObjectId
  ): Promise<RelatedStudentEnrollmentDetails> {
    const parent = await this.userModel
      .findOne({
        _id: parentId,
        roleName: Roles.PARENT,
        ...(organizationId ? { organizationId } : {}),
      })
      .select(ParentService.PARENT_SELECT)
      .lean();

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const enrollment = await this.enrollmentModel
      .findOne({
        _id: enrollmentId,
        ...(organizationId ? { organizationId } : {}),
      })
      .select(
        '_id userId courseId accessType enrolledAt completedAt progressPercentage timeSpentMinutes lastAccessedAt subscription certificate progress'
      )
      .lean();

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const student = await this.userModel
      .findOne({
        _id: enrollment.userId,
        roleName: Roles.STUDENT,
        ...(organizationId ? { organizationId } : {}),
      })
      .select(ParentService.STUDENT_LINK_SELECT)
      .lean();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const linkedByParentUser = (student as unknown as User & { ParentUser?: mongoose.Types.ObjectId }).ParentUser?.toString() === parentId.toString();
    const parentChildIds = Array.isArray(parent.childUsersIds) ? parent.childUsersIds.map((id) => id.toString()) : [];
    const linkedByChildUsers = parentChildIds.includes(enrollment.userId.toString());

    if (!linkedByParentUser && !linkedByChildUsers) {
      throw new ForbiddenException('Student is not related to this parent');
    }

    const course = await this.courseModel
      .findOne({
        _id: enrollment.courseId,
        ...(organizationId ? { organizationId } : {}),
      })
      .select('_id name description shortDescription learningObjectives modulesIds')
      .lean();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const moduleIds = Array.isArray(course.modulesIds) ? course.modulesIds.map((id) => new mongoose.Types.ObjectId(id)) : [];

    const modules =
      moduleIds.length > 0
        ? await this.courseModuleModel
            .find({
              _id: { $in: moduleIds },
            })
            .select('_id title description learningObjectives contentsIds')
            .lean()
        : [];

    const moduleById = new Map(modules.map((m) => [m._id.toString(), m]));
    const maybeModules = moduleIds.map((id) => moduleById.get(id.toString()));
    type ModuleEl = NonNullable<(typeof maybeModules)[number]>;
    const orderedModules = maybeModules.filter((m): m is ModuleEl => m != null);

    const contentIds = orderedModules.flatMap((m) => m.contentsIds ?? []);
    const deduplicatedContentIds = [...new Set(contentIds.map((id) => id.toString()))].map((id) => new mongoose.Types.ObjectId(id));
    const contents =
      deduplicatedContentIds.length > 0
        ? await this.courseContentModel
            .find({
              _id: { $in: deduplicatedContentIds },
            })
            .select('_id moduleId title description type')
            .lean()
        : [];
    const contentById = new Map(contents.map((content) => [content._id.toString(), content]));

    const mappedModules = orderedModules.map((mod) => {
      const maybeContents = (mod.contentsIds ?? []).map((contentId) => contentById.get(contentId.toString()));
      type ContentEl = NonNullable<(typeof maybeContents)[number]>;
      const contentsList = maybeContents.filter((c): c is ContentEl => c != null);
      return {
        _id: mod._id,
        title: mod.title,
        description: mod.description,
        learningObjectives: mod.learningObjectives,
        contents: contentsList.map((content) => ({
          _id: content._id,
          title: content.title,
          description: content.description,
          type: content.type,
        })),
      };
    });

    const completedModules = enrollment.progress?.completedModules?.length ?? 0;
    const completedContents = enrollment.progress?.completedContents?.length ?? 0;
    const totalModules = mappedModules.length;
    const totalContents = mappedModules.reduce((acc, module) => acc + module.contents.length, 0);

    return {
      student: {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        username: student.username,
        email: student.email,
        phone: student.phone,
      },
      enrollment: {
        _id: enrollment._id,
        courseId: enrollment.courseId,
        accessType: enrollment.accessType,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        progressPercentage: enrollment.progressPercentage ?? 0,
        timeSpentMinutes: enrollment.timeSpentMinutes ?? 0,
        lastAccessedAt: enrollment.lastAccessedAt,
        subscription: enrollment.subscription,
        certificate: enrollment.certificate,
        progress: enrollment.progress as unknown as EnrollmentProgress | undefined,
      },
      course: {
        _id: course._id,
        name: course.name,
        description: course.description,
        shortDescription: course.shortDescription,
        learningObjectives: course.learningObjectives,
        modules: mappedModules,
      },
      summary: {
        totalModules,
        totalContents,
        completedModules,
        completedContents,
      },
    } as RelatedStudentEnrollmentDetails;
  }

  /** Enrollment fields used for progress response (excludes progress blob, subscription, certificate, etc.) */
  private static readonly ENROLLMENT_SELECT = 'userId courseId progressPercentage timeSpentMinutes enrolledAt completedAt lastAccessedAt';

  private applyProgressFilters(enrollments: StudentProgressEnrollment[], filters?: ParentProgressFilters): StudentProgressEnrollment[] {
    if (!filters || (!filters.dateFrom && !filters.dateTo && !filters.search?.trim())) {
      return enrollments;
    }
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;
    const searchLower = filters.search?.trim().toLowerCase() ?? '';

    return enrollments.filter((e) => {
      if (searchLower) {
        const title = (e.courseTitle ?? '').toLowerCase();
        if (!title.includes(searchLower)) return false;
      }
      if (dateFrom ?? dateTo) {
        const enrolledAt = e.enrolledAt ? new Date(e.enrolledAt).getTime() : 0;
        const lastAt = e.lastAccessedAt ? new Date(e.lastAccessedAt).getTime() : 0;
        const from = dateFrom?.getTime() ?? -Infinity;
        const to = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : Infinity;
        const inRange = (t: number) => t >= from && t <= to;
        if (!inRange(enrolledAt) && !inRange(lastAt)) return false;
      }
      return true;
    });
  }

  private async buildStudentsProgress(
    students: User[],
    organizationId?: mongoose.Types.ObjectId,
    filters?: ParentProgressFilters
  ): Promise<RelatedStudentProgress[]> {
    const studentIds = students.map((s) => s._id);

    const enrollments = await this.enrollmentModel
      .find({
        userId: { $in: studentIds },
        ...(organizationId ? { organizationId } : {}),
      })
      .select(ParentService.ENROLLMENT_SELECT)
      .populate('courseId', 'title')
      .lean();

    const enrollmentsByStudentId = new Map<
      string,
      (Enrollment & { courseId?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; title?: string } })[]
    >();
    for (const enrollment of enrollments) {
      const key = enrollment.userId.toString();
      const current = enrollmentsByStudentId.get(key) ?? [];
      current.push(enrollment as unknown as Enrollment & { courseId?: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId; title?: string } });
      enrollmentsByStudentId.set(key, current);
    }

    return students.map((student) => {
      const studentEnrollments = enrollmentsByStudentId.get(student._id.toString()) ?? [];
      const mappedEnrollments: StudentProgressEnrollment[] = studentEnrollments.map((enrollment) => {
        const courseId =
          typeof enrollment.courseId === 'object' && enrollment.courseId !== null && '_id' in enrollment.courseId
            ? (enrollment.courseId as { _id: mongoose.Types.ObjectId })._id
            : (enrollment.courseId as mongoose.Types.ObjectId);
        const courseTitle =
          typeof enrollment.courseId === 'object' && enrollment.courseId !== null && 'title' in enrollment.courseId
            ? ((enrollment.courseId as { title?: string }).title ?? '')
            : '';
        return {
          enrollmentId: enrollment._id instanceof mongoose.Types.ObjectId ? enrollment._id : new mongoose.Types.ObjectId(String(enrollment._id)),
          courseId,
          courseTitle,
          progressPercentage: enrollment.progressPercentage ?? 0,
          timeSpentMinutes: enrollment.timeSpentMinutes ?? 0,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          lastAccessedAt: enrollment.lastAccessedAt,
        };
      });

      const filteredEnrollments = this.applyProgressFilters(mappedEnrollments, filters);

      const totalEnrollments = filteredEnrollments.length;
      const completedEnrollments = filteredEnrollments.filter(
        (enrollment) => !!enrollment.completedAt || (enrollment.progressPercentage ?? 0) >= 100
      ).length;
      const totalProgress = filteredEnrollments.reduce((acc, enrollment) => acc + (enrollment.progressPercentage ?? 0), 0);
      const totalTimeSpentMinutes = filteredEnrollments.reduce((acc, enrollment) => acc + (enrollment.timeSpentMinutes ?? 0), 0);
      const latestAccessMs = Math.max(...filteredEnrollments.map((enrollment) => enrollment.lastAccessedAt?.getTime() ?? 0), 0);

      const summary: StudentProgressSummary = {
        totalEnrollments,
        completedEnrollments,
        averageProgressPercentage: totalEnrollments > 0 ? Number((totalProgress / totalEnrollments).toFixed(2)) : 0,
        totalTimeSpentMinutes,
        lastAccessedAt: latestAccessMs > 0 ? new Date(latestAccessMs) : null,
      };

      return {
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          username: student.username,
          email: student.email,
          phone: student.phone!,
        },
        summary,
        enrollments: filteredEnrollments,
      };
    });
  }
}
