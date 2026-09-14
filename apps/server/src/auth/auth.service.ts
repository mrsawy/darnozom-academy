import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../role/entities/role.entity';
import { OrganizationService } from '../organization/organization.service';
import { UserService } from '../user/services/user.service';
import { User, UserDocument } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { AuthErrors, AuthSuccessMessages, CommonErrors, Roles, UserErrors, UserStatus } from '@islamic-academy/shared-types';
import { QueryService } from '../database/query.service';
import { randomBytes, randomUUID } from 'node:crypto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { TokenService } from './services/token.service';
import { AuthSessionService, AuthTokenResult } from './services/auth-session.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { USER_POPULATE } from './constants/user-populate.constant';
import type { JwtPayload } from 'jsonwebtoken';

/** How long a just-rotated refresh token is still accepted, so concurrent refreshes converge instead of logging the user out. */
const REFRESH_TOKEN_GRACE_MS = 30_000;

/** Dev-only stand-in for a real email transport — logs instead of sending. */
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(PasswordResetToken.name) private readonly passwordResetTokenModel: Model<PasswordResetToken>,
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
    private readonly query: QueryService,
    private readonly tokenService: TokenService,
    private readonly authSessionService: AuthSessionService
  ) {}

  async register(registerDto: RegisterDto) {
    const session = await this.connection.startSession();
    session.startTransaction();

    const { userDto, organizationDto } = registerDto;
    const isStudent = userDto.roleName === Roles.STUDENT;
    const isParent = userDto.roleName === Roles.PARENT;

    try {
      const userId = new mongoose.Types.ObjectId();
      const organizationId = new mongoose.Types.ObjectId();

      // Users who register with a non-student/parent role become the SUPER_ADMIN of a new organization.
      const roleName: Roles = isStudent ? Roles.STUDENT : isParent ? Roles.PARENT : Roles.SUPER_ADMIN;

      const foundedRole = await this.query.findOneOrThrow<Role>(Role.name, { name: roleName }, AuthErrors.ROLE_NOT_FOUND_CREATE_FIRST);

      const user = await this.userService.create(
        {
          ...userDto,
          _id: userId,
          organizationId: isStudent || isParent ? undefined : organizationId,
          roleName: foundedRole.name,
          status: UserStatus.ACTIVE,
          onboardingComplete: true,
          authProvider: 'local',
        },
        session
      );

      await user.populate('role');

      if (!isStudent && !isParent) {
        await this.organizationService.create(
          {
            ...organizationDto!,
            superAdminId: userId,
            _id: organizationId,
          },
          session
        );
      }

      const sid = randomUUID();
      const rtid = randomUUID();
      const now = new Date();
      await this.userModel.updateOne(
        { _id: userId },
        { $set: { activeSessionId: sid, activeRefreshTokenId: rtid, activeSessionUpdatedAt: now, lastLogin: now } },
        { session }
      );
      const payload = { ...user.toObject(), password: undefined, activeSessionId: sid };
      const token = this.tokenService.generateToken({ _id: userId.toString(), sid });
      const refreshToken = this.tokenService.generateRefreshToken({ _id: userId.toString(), sid, rtid });

      await session.commitTransaction();

      return {
        access_token: token,
        refresh_token: refreshToken,
        sid,
        user: payload,
      };
    } catch (error) {
      this.logger.error('Registration failed, rolling back transaction', error);
      await session.abortTransaction();

      if (error instanceof ConflictException) {
        if (error.message.includes('username')) {
          throw new ConflictException(AuthErrors.USERNAME_TAKEN);
        }
        if (error.message.includes('email')) {
          throw new ConflictException(AuthErrors.EMAIL_ALREADY_REGISTERED);
        }
        if (error.message.includes('phone')) {
          throw new ConflictException(AuthErrors.PHONE_TAKEN);
        }
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  async login(loginDto: LoginDto): Promise<AuthTokenResult> {
    try {
      const { identifier, password } = loginDto;
      const foundedUser = await this.query.findOne<User>(
        User.name,
        mongoose.Types.ObjectId.isValid(identifier)
          ? { _id: identifier, deletedAt: null }
          : { deletedAt: null, $or: [{ email: identifier }, { username: identifier }, { phone: identifier }] },
        { populate: USER_POPULATE.map((p) => p.path) }
      );
      if (!foundedUser) {
        throw new Error(AuthErrors.INVALID_CREDENTIALS);
      }
      const userWithPassword = foundedUser as UserDocument;
      if (!userWithPassword.password) {
        throw new Error(AuthErrors.LOGIN_PASSWORD_NOT_SET);
      }

      const isMatch = await bcrypt.compare(password, userWithPassword.password);
      if (!isMatch) {
        throw new Error(AuthErrors.INVALID_CREDENTIALS);
      }

      const previousSid = foundedUser.activeSessionId ?? null;
      return await this.authSessionService.rotateSessionAndIssueTokens(foundedUser as unknown as UserDocument & { role: Role }, previousSid);
    } catch (error: unknown) {
      this.logger.error('Login failed', error);
      const errorMessage = error instanceof Error ? error.message : CommonErrors.SOMETHING_WENT_WRONG;
      throw new UnauthorizedException(errorMessage);
    }
  }

  /** Verify a JWT and return the associated user. Used by AuthGuard. */
  async verifyToken(token: string): Promise<UserDocument & { role: Role }> {
    try {
      const { _id, sid } = this.tokenService.verifyAccessToken(token);
      const foundedUser = await this.query.findOne<User>(User.name, { _id, activeSessionId: sid, deletedAt: null }, { populate: USER_POPULATE.map((p) => p.path) });
      if (!foundedUser) throw new UnauthorizedException(AuthErrors.AUTHENTICATION_FAILED);
      return foundedUser.toObject() as UserDocument & { role: Role };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(AuthErrors.AUTHENTICATION_FAILED);
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokenResult> {
    try {
      const { _id, sid, rtid } = this.tokenService.verifyRefreshToken(refreshToken);

      const newRtid = randomUUID();
      // Atomically rotate, but only if this request still holds the *current* refresh-token id.
      const rotation = await this.userModel.updateOne(
        { _id, activeSessionId: sid, activeRefreshTokenId: rtid },
        { $set: { previousRefreshTokenId: rtid, activeRefreshTokenId: newRtid, refreshTokenRotatedAt: new Date() } }
      );

      let effectiveRtid: string;
      if (rotation.modifiedCount === 1) {
        effectiveRtid = newRtid;
      } else {
        const current = await this.userModel
          .findOne({ _id, activeSessionId: sid, deletedAt: null })
          .select('activeRefreshTokenId previousRefreshTokenId refreshTokenRotatedAt')
          .lean();

        const rotatedAt = current?.refreshTokenRotatedAt ? new Date(current.refreshTokenRotatedAt).getTime() : 0;
        const withinGrace = current?.previousRefreshTokenId === rtid && rotatedAt > 0 && Date.now() - rotatedAt <= REFRESH_TOKEN_GRACE_MS;

        if (!current?.activeRefreshTokenId || !withinGrace) {
          throw new UnauthorizedException(AuthErrors.REFRESH_TOKEN_REVOKED);
        }
        effectiveRtid = current.activeRefreshTokenId;
      }

      const foundedUser = await this.query.findOne<User>(User.name, { _id, activeSessionId: sid, deletedAt: null }, { populate: USER_POPULATE.map((p) => p.path) });
      if (!foundedUser) throw new UnauthorizedException(AuthErrors.REFRESH_TOKEN_REVOKED);

      const newAccessToken = this.tokenService.generateToken({ _id, sid });
      const newRefreshToken = this.tokenService.generateRefreshToken({ _id, sid, rtid: effectiveRtid });
      const userObject = (foundedUser as UserDocument).toObject() as Record<string, unknown>;

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        sid,
        user: { ...userObject, password: undefined },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(AuthErrors.REFRESH_FAILED);
    }
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const successMessage = AuthSuccessMessages.PASSWORD_RESET_LINK_SENT;

    const user = await this.userModel.findOne({ email: email.toLowerCase(), deletedAt: null }).lean();
    if (!user) {
      return { message: successMessage };
    }

    await this.passwordResetTokenModel.deleteMany({ userId: user._id });

    const rawToken = randomBytes(48).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);

    await this.passwordResetTokenModel.create({
      userId: user._id,
      email: user.email,
      hashedToken,
      failedAttempts: 0,
    });

    // No email transport wired up in this build — log the link for local/dev use.
    this.logger.log(`Password reset requested for ${user.email}. Token (dev-only, would be emailed): ${rawToken}`);

    return { message: successMessage };
  }

  async resetPassword(token: string, email: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: email.toLowerCase(), deletedAt: null }).lean();
    if (!user) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_TOKEN_INVALID);
    }

    const storedToken = await this.passwordResetTokenModel.findOne({ userId: user._id }, null, { sort: { createdAt: -1 } });

    if (!storedToken || Date.now() - new Date(storedToken.createdAt).getTime() > PASSWORD_RESET_TTL_MS) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_TOKEN_INVALID);
    }

    const isValid = await bcrypt.compare(token, storedToken.hashedToken);
    if (!isValid) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_TOKEN_INVALID);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userModel.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, activeSessionId: null, activeRefreshTokenId: null } }
    );

    await this.passwordResetTokenModel.deleteMany({ userId: user._id });

    return { message: AuthSuccessMessages.PASSWORD_RESET_SUCCESS };
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException(UserErrors.USER_NOT_FOUND);
    const phoneUser = await this.userModel.findOne({ phone: dto.phone, deletedAt: null });
    if (phoneUser) throw new BadRequestException(AuthErrors.PHONE_TAKEN);

    if (user.onboardingComplete === true) throw new ForbiddenException(AuthErrors.ONBOARDING_ALREADY_COMPLETED);

    // Only STUDENT and PARENT skip the organization creation step.
    const isStudent = dto.roleName === Roles.STUDENT;
    const isParent = dto.roleName === Roles.PARENT;
    const needsOrganization = !isStudent && !isParent;

    if (needsOrganization && !dto.organizationDto) {
      throw new BadRequestException(AuthErrors.ORGANIZATION_DTO_REQUIRED_FOR_ROLE);
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const organizationId = needsOrganization ? new mongoose.Types.ObjectId() : undefined;

      user.roleName = dto.roleName;
      user.phone = dto.phone;
      if (dto.firstName) user.firstName = dto.firstName;
      if (dto.lastName) user.lastName = dto.lastName;
      if (organizationId) user.organizationId = organizationId;
      user.onboardingComplete = true;

      await user.save({ session });

      if (needsOrganization && organizationId) {
        await this.organizationService.create(
          {
            ...dto.organizationDto!,
            superAdminId: user._id,
            _id: organizationId,
            settings: { branding: { logo: '', primaryColor: '#000000', secondaryColor: '#ffffff' } },
          },
          session
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    return { message: AuthSuccessMessages.ONBOARDING_COMPLETE };
  }

  decodeToken(token: string): JwtPayload | string | null {
    return this.tokenService.decode(token);
  }
}
