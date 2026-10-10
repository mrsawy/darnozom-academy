import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import mongoose, { ClientSession, PaginateModel, PaginateOptions } from 'mongoose';
import { User, UserDocument } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { handleError } from '../../utils/errorHandling';
import { escapeRegex } from '../../utils/approval.utils';
import { CreateUserDto, UpdateUserDto } from '@lms-organization/shared-types/dto';
import { Roles, UserErrors, UserSuccessMessages } from '@lms-organization/shared-types';
import { INSTRUCTOR_CATEGORY_CHANGED_EVENT, InstructorCategoryChangedEvent } from '../../category/events/category-count.events';
import { USER_CREATED_FOR_AI_EVENT, UserCreatedForAiEvent } from '../../ai-subscription/events/user-created-for-ai.event';
import { NOT_DELETED_USER_FILTER, withNotDeletedUserFilter } from '../utils/not-deleted-user.filter';
import { buildSoftDeleteSet } from 'src/utils/soft-delete';

const saltRounds = 10;

// Type assertion for bcrypt to avoid unsafe member access errors
const bcryptTyped = bcrypt as { hash: (data: string, saltOrRounds: number) => Promise<string> };

// Helper function to hash passwords with proper typing
async function hashPassword(password: string): Promise<string> {
  return await bcryptTyped.hash(password, saltRounds);
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: PaginateModel<User>,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async create(createUserDto: CreateUserDto & { organizationId?: mongoose.Types.ObjectId }, session?: ClientSession) {
    try {
      const hashedPassword = createUserDto.password ? await hashPassword(createUserDto.password) : undefined;

      const createdUser = new this.userModel({
        ...createUserDto,
        ...(hashedPassword === undefined ? {} : { password: hashedPassword }),
      });
      await createdUser.save({ session });

      if (createUserDto.roleName === Roles.INSTRUCTOR && createUserDto.categoriesIds?.length) {
        this.eventEmitter.emit(
          INSTRUCTOR_CATEGORY_CHANGED_EVENT,
          new InstructorCategoryChangedEvent(createUserDto.categoriesIds.map(String), [], createdUser._id.toString())
        );
      }

      this.eventEmitter.emit(USER_CREATED_FOR_AI_EVENT, new UserCreatedForAiEvent(createdUser._id.toString()));

      return createdUser;
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : error);

      if (error && typeof error === 'object' && 'code' in error && error.code === 11_000 && 'keyValue' in error) {
        const errorObj = error as { keyValue: Record<string, unknown> };
        const field = Object.keys(errorObj.keyValue)[0];
        const value = String(errorObj.keyValue[field]);
        throw new ConflictException(`${UserErrors.FIELD_VALUE_ALREADY_EXISTS}|${field}|${value}`);
      }
      throw new InternalServerErrorException(UserErrors.FAILED_TO_CREATE_USER);
    }
  }

  findAll() {
    return 'This action returns all user';
  }

  async findOne(identifier: string) {
    let foundedUser: UserDocument | null = null;

    foundedUser = await (mongoose.Types.ObjectId.isValid(identifier)
      ? this.userModel
          .findOne(withNotDeletedUserFilter({ _id: identifier }))
          .populate({
            path: 'role',
            model: 'Role',
            localField: 'roleName',
            foreignField: 'name',
          })
          .populate('organization')
          .populate('wallet')
      : this.userModel
          .findOne(
            withNotDeletedUserFilter({
              $or: [{ email: identifier }, { username: identifier }, { phone: identifier }],
            })
          )
          .populate({
            path: 'role',
            model: 'Role',
            localField: 'role',
            foreignField: 'name',
          })
          .populate('organization')
          .populate('wallet'));
    if (!foundedUser) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    return foundedUser;
  }

  async filterOne(filters: mongoose.RootFilterQuery<User>) {
    const f = { ...filters } as mongoose.RootFilterQuery<User> & { _id?: string | mongoose.Types.ObjectId };
    if (f._id && typeof f._id === 'string') {
      f._id = new mongoose.Types.ObjectId(f._id);
    }
    const queryFilter: mongoose.FilterQuery<User> = withNotDeletedUserFilter(f as mongoose.FilterQuery<User>);
    const foundedUser = await this.userModel
      .findOne(queryFilter)
      .populate({
        path: 'role',
        model: 'Role',
        localField: 'role',
        foreignField: 'name',
      })
      .populate('organization')
      .populate('wallet')
      .populate('categories');
    if (!foundedUser) throw new NotFoundException(UserErrors.USER_NOT_FOUND);

    if (foundedUser.roleName === Roles.PARENT) {
      await foundedUser.populate('childUsers', '_id firstName lastName username email phone roleName');
    } else if (foundedUser.roleName == Roles.STUDENT) {
      await foundedUser.populate('parentUser', '_id firstName lastName username email phone roleName');
    } else if (foundedUser.roleName === Roles.INSTRUCTOR) {
      await foundedUser.populate('categories', '_id name');
    }

    return foundedUser;
  }

  async update(filters: mongoose.RootFilterQuery<User>, updateUserDto: UpdateUserDto, session?: mongoose.ClientSession) {
    try {
      if (updateUserDto.password) {
        updateUserDto.password = await hashPassword(updateUserDto.password);
        (updateUserDto as UpdateUserDto & { passwordLastUpdated?: Date }).passwordLastUpdated = new Date();
      }

      // Snapshot for instructor category event
      let existingUser: User | null = null;
      if (updateUserDto.categoriesIds !== undefined) {
        existingUser = await this.userModel
          .findOne(withNotDeletedUserFilter(filters as mongoose.FilterQuery<User>))
          .lean()
          .exec();
      }

      const result = await this.userModel.updateOne(
        withNotDeletedUserFilter(filters as mongoose.FilterQuery<User>),
        { $set: updateUserDto },
        { session }
      );
      if (result.matchedCount === 0) {
        throw new NotFoundException(UserErrors.USER_NOT_FOUND);
      }

      // Emit instructor category changed if categoriesIds were updated
      if (updateUserDto.categoriesIds !== undefined && existingUser && existingUser.roleName === Roles.INSTRUCTOR) {
        const oldCatIds = (existingUser.categoriesIds ?? []).map(String);
        const newCatIds = updateUserDto.categoriesIds.map(String);
        const oldSet = new Set(oldCatIds);
        const newSet = new Set(newCatIds);
        const added = newCatIds.filter((id) => !oldSet.has(id));
        const removed = oldCatIds.filter((id) => !newSet.has(id));
        const userId = (existingUser as unknown as { _id: mongoose.Types.ObjectId })._id.toString();
        if (added.length > 0 || removed.length > 0) {
          this.eventEmitter.emit(INSTRUCTOR_CATEGORY_CHANGED_EVENT, new InstructorCategoryChangedEvent(added, removed, userId));
        }
      }

      if (result.modifiedCount === 0) {
        return {
          message: UserSuccessMessages.USER_MATCHED_NO_CHANGES,
          updated: false,
        };
      }

      return {
        message: UserSuccessMessages.USER_UPDATED_SUCCESSFULLY,
        updated: true,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        handleError(error);
      } else {
        handleError(String(error));
      }
    }
  }

  /**
   * Soft-deletes a user by setting `deletedAt` / `deletedById` and clearing active session tokens
   * so existing JWTs stop resolving. Returns `{ deletedCount }` for callers that
   * previously relied on `deleteOne`.
   */
  async delete(filters: mongoose.RootFilterQuery<User>, deletedById?: string | mongoose.Types.ObjectId | null) {
    const result = await this.userModel.updateOne(withNotDeletedUserFilter(filters as mongoose.FilterQuery<User>), {
      $set: {
        ...buildSoftDeleteSet(deletedById),
        activeSessionId: null,
        activeRefreshTokenId: null,
        previousRefreshTokenId: null,
        refreshTokenRotatedAt: null,
      },
    });
    return {
      acknowledged: result.acknowledged,
      deletedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Promotes a GUEST user (created via Google OAuth before onboarding) to STUDENT.
   * Called after a successful payment so the user is only promoted once money is confirmed.
   * Idempotent: if the user is already non-GUEST the call is a no-op.
   */
  async promoteGuestToStudent(userId: string, session?: ClientSession): Promise<UserDocument> {
    const user = await this.userModel.findOne(withNotDeletedUserFilter({ _id: userId })).session(session ?? null);
    if (!user) throw new BadRequestException(UserErrors.USER_NOT_FOUND);
    if (user.roleName !== Roles.GUEST) return user;
    user.roleName = Roles.STUDENT;
    user.onboardingComplete = true;
    await user.save({ session });
    return user;
  }

  async getByOrganization(
    organizationId: mongoose.Types.ObjectId,
    options: PaginateOptions & { search?: string },
    filters?: mongoose.RootFilterQuery<User>
  ) {
    const queryFilters: mongoose.RootFilterQuery<User> = filters ?? {};
    const organizationIdObj = new mongoose.Types.ObjectId(organizationId);
    // Object.assign avoids Promise-like inference from spread; Record<string, unknown> allows $or (RootFilterQuery unions with Query)
    const paginateQuery = Object.assign({}, queryFilters, {
      organizationId: organizationIdObj,
      ...NOT_DELETED_USER_FILTER,
    }) as mongoose.RootFilterQuery<User> & Record<string, unknown>;

    if (options.search?.trim()) {
      const searchRegex = new RegExp(escapeRegex(options.search.trim()), 'i');
      paginateQuery.$or = [
        { firstName: { $regex: searchRegex } },
        { lastName: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
        { username: { $regex: searchRegex } },
      ];
    }

    const { search: _search, ...restOptions } = options;
    const paginateOptions: PaginateOptions = {
      ...restOptions,
      sort: options.sort ?? { createdAt: -1 },
    };

    const [result, roleCountsAgg] = await Promise.all([
      this.userModel.paginate(paginateQuery, paginateOptions),
      this.userModel.aggregate<{ _id: Roles; count: number }>([{ $match: paginateQuery }, { $group: { _id: '$roleName', count: { $sum: 1 } } }]),
    ]);

    // Manually populate 'role' virtuals for paginated docs
    result.docs = await this.userModel.populate(result.docs, { path: 'role' });

    const roleCounts: Record<Roles, number> = {
      [Roles.STUDENT]: 0,
      [Roles.PARENT]: 0,
      [Roles.ADMIN]: 0,
      [Roles.SUPER_ADMIN]: 0,
      [Roles.INSTRUCTOR]: 0,
      [Roles.SECRETARY]: 0,
      [Roles.PLATFORM_ADMIN]: 0,
      [Roles.GUEST]: 0,
    };

    let totalStudents = 0;
    let totalParents = 0;
    let totalAdmins = 0;
    let totalInstructors = 0;

    for (const { _id: roleName, count } of roleCountsAgg) {
      roleCounts[roleName] = count;
      switch (roleName) {
        case Roles.STUDENT: {
          totalStudents = count;
          break;
        }
        case Roles.PARENT: {
          totalParents = count;
          break;
        }
        case Roles.ADMIN:
        case Roles.SUPER_ADMIN: {
          totalAdmins += count;
          break;
        }
        case Roles.INSTRUCTOR: {
          {
            totalInstructors = count;
            // No default
          }
          break;
        }
      }
    }

    return {
      ...result,
      totalStudents,
      totalParents,
      totalAdmins,
      totalInstructors,
      roleCounts,
    };
  }

  async completeOrganizationOnboarding(userId: string) {
    const user = await this.userModel.findOne(withNotDeletedUserFilter({ _id: userId }));
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);
    if (user.roleName !== Roles.SUPER_ADMIN) {
      throw new ForbiddenException(UserErrors.ONLY_SUPER_ADMIN_CAN_COMPLETE_ORG_ONBOARDING);
    }
    if (user.organizationOnboarded !== true) {
      user.organizationOnboarded = true;
      await user.save();
    }
    const { password: _password, ...userData } = user.toObject({ virtuals: true });
    return {
      message: UserSuccessMessages.ORGANIZATION_ONBOARDING_COMPLETED,
      user: userData,
    };
  }
}
