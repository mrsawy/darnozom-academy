import { ConflictException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionDto } from './dto/permission.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Role } from './entities/role.entity';
import { Model, Types } from 'mongoose';
import { CommonErrors, RoleErrors, RoleSuccessMessages, Roles } from '@darnozom/shared-types';
import { User } from 'src/user/entities/user.entity';
import type { ICondition } from '@darnozom/shared-types';

/** Roles that must never be removed from the platform. */
const PROTECTED_ROLE_NAMES: ReadonlySet<Roles> = new Set([Roles.PLATFORM_ADMIN, Roles.SUPER_ADMIN, Roles.GUEST]);

function toStoredConditions(conditions?: PermissionDto['conditions']): ICondition | ICondition[] | undefined {
  if (!conditions?.length) {
    return undefined;
  }
  const mapped: ICondition[] = conditions.map((c) => ({ key: c.key, value: c.value }));
  return mapped.length === 1 ? mapped[0] : mapped;
}

function normalizePermissionsForWrite(perms: PermissionDto[]): NonNullable<Role['permissions']> {
  return perms.map((p) => ({
    action: p.action,
    subject: p.subject,
    conditions: toStoredConditions(p.conditions),
  }));
}

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
    @InjectModel(User.name) private readonly userModel: Model<User>
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const existing = await this.roleModel.findOne({ name: createRoleDto.name });
    if (existing) {
      throw new ConflictException(RoleErrors.ROLE_ALREADY_EXISTS);
    }

    try {
      const role = await this.roleModel.create({
        name: createRoleDto.name,
        permissions: normalizePermissionsForWrite(createRoleDto.permissions),
      });
      return {
        role,
        message: RoleSuccessMessages.ROLE_CREATED,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const err = error as { code?: number };
      if (err.code === 11_000) {
        throw new ConflictException(RoleErrors.ROLE_ALREADY_EXISTS);
      }
      this.logger.error(`role.create failed: ${(error as Error)?.message ?? String(error)}`, (error as Error)?.stack);
      throw new InternalServerErrorException(CommonErrors.SOMETHING_WENT_WRONG);
    }
  }

  async findAll() {
    // eslint-disable-next-line unicorn/no-array-sort -- Mongoose Query.prototype.sort, not Array#sort
    return this.roleModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string) {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { name: id };

    const foundedRole = await this.roleModel.findOne(filter);

    if (!foundedRole) {
      throw new NotFoundException(RoleErrors.ROLE_NOT_FOUND);
    }
    return foundedRole;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { name: id };

    const $set: Record<string, unknown> = {};
    if (updateRoleDto.permissions !== undefined) {
      $set.permissions = normalizePermissionsForWrite(updateRoleDto.permissions);
    }

    if (Object.keys($set).length === 0) {
      const existing = await this.roleModel.findOne(filter);
      if (!existing) throw new NotFoundException(RoleErrors.ROLE_NOT_FOUND);
      return { role: existing, message: RoleSuccessMessages.ROLE_UPDATED };
    }

    let updated: Role | null;
    try {
      updated = await this.roleModel.findOneAndUpdate(filter, { $set }, { new: true, runValidators: true });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const mongooseErr = error as { name?: string; message?: string; errors?: Record<string, unknown>; stack?: string };
      this.logger.error(
        `role.update failed for id=${id}: ${mongooseErr?.name ?? 'Error'} ${mongooseErr?.message ?? String(error)}`,
        mongooseErr?.stack
      );
      if (mongooseErr?.errors) {
        this.logger.error(`role.update validation details: ${JSON.stringify(mongooseErr.errors)}`);
      }
      if (mongooseErr?.name === 'ValidationError' || mongooseErr?.name === 'CastError') {
        throw new InternalServerErrorException(mongooseErr.message ?? CommonErrors.SOMETHING_WENT_WRONG);
      }
      throw new InternalServerErrorException(CommonErrors.SOMETHING_WENT_WRONG);
    }

    if (!updated) {
      throw new NotFoundException(RoleErrors.ROLE_NOT_FOUND);
    }

    return {
      role: updated,
      message: RoleSuccessMessages.ROLE_UPDATED,
    };
  }

  async remove(id: string) {
    const filter = Types.ObjectId.isValid(id) ? { _id: id } : { name: id };

    const role = await this.roleModel.findOne(filter);
    if (!role) {
      throw new NotFoundException(RoleErrors.ROLE_NOT_FOUND);
    }

    if (PROTECTED_ROLE_NAMES.has(role.name)) {
      throw new ConflictException(RoleErrors.ROLE_PROTECTED_CANNOT_DELETE);
    }

    const usersWithRole = await this.userModel.countDocuments({ roleName: role.name, deletedAt: null });
    if (usersWithRole > 0) {
      throw new ConflictException(RoleErrors.ROLE_IN_USE_CANNOT_DELETE);
    }

    await this.roleModel.deleteOne({ _id: role._id });

    return {
      message: RoleSuccessMessages.ROLE_DELETED,
    };
  }
}
