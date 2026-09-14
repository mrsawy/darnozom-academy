import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '@islamic-academy/shared-types/dto';
import { UserErrors, UserStatus } from '@islamic-academy/shared-types';
import { User, UserDocument } from '../entities/user.entity';
import { UpdateUserDto } from '../dto/update-user.dto';

/** Extra fields the auth flow sets when creating a user beyond what the public CreateUserDto exposes. */
export interface CreateUserInput extends CreateUserDto {
  _id?: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  status?: UserStatus;
  onboardingComplete?: boolean;
  authProvider?: string;
}

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

  async create(createUserDto: CreateUserInput, session?: ClientSession) {
    try {
      const hashedPassword = createUserDto.password ? await hashPassword(createUserDto.password) : undefined;

      const createdUser = new this.userModel({
        ...createUserDto,
        ...(hashedPassword === undefined ? {} : { password: hashedPassword }),
      });
      await createdUser.save({ session });
      return createdUser;
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : error);

      if (error && typeof error === 'object' && 'code' in error && error.code === 11_000 && 'keyValue' in error) {
        const errorObj = error as { keyValue: Record<string, unknown> };
        const field = Object.keys(errorObj.keyValue)[0];
        const value = String(errorObj.keyValue[field]);
        throw new ConflictException(`${UserErrors.USER_NOT_FOUND}|${field}|${value}`);
      }
      throw new InternalServerErrorException(UserErrors.USER_NOT_FOUND);
    }
  }

  findAll() {
    return this.userModel.find().populate('role').populate('organization').exec();
  }

  async findOne(identifier: string): Promise<UserDocument> {
    const foundedUser = await (mongoose.Types.ObjectId.isValid(identifier)
      ? this.userModel.findOne({ _id: identifier }).populate('role').populate('organization')
      : this.userModel.findOne({ $or: [{ email: identifier }, { username: identifier }, { phone: identifier }] }).populate('role').populate('organization'));

    if (!foundedUser) throw new NotFoundException(UserErrors.USER_NOT_FOUND);
    return foundedUser as UserDocument;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const patch: Record<string, unknown> = { ...updateUserDto };
    if (typeof patch.password === 'string') {
      patch.password = await hashPassword(patch.password);
    }
    const user = await this.userModel.findByIdAndUpdate(id, patch, { new: true }).exec();
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);
    return user;
  }

  /** Soft-delete: marks deletedAt instead of removing the document. */
  async remove(id: string) {
    const user = await this.userModel.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).exec();
    if (!user) throw new NotFoundException(UserErrors.USER_NOT_FOUND);
    return user;
  }
}
