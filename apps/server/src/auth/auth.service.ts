import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  forwardRef,
  Inject,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { Role } from 'src/role/entities/role.entity';
import { OrganizationService } from '../organization/organization.service';
import { UserService } from '../user/services/user.service';
import { User, UserDocument } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model, PaginateModel } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { WalletService } from '../wallet/wallet.service';
import { BillingCycle } from '../utils/enums/billingCycle.enum';
import {
  AuthErrors,
  AuthSuccessMessages,
  CommonErrors,
  Currency,
  PASSWORD_RESET,
  PasswordResetChannel,
  PasswordResetClient,
  type VerifyPasswordResetOtpResponse,
  PlanTier,
  RATE_LIMIT,
  Roles,
  UserErrors,
  UserStatus,
  VerificationStatus,
} from '@lms-organization/shared-types';
import { SubscriptionService } from '../subscription/services/subscription.service';
import { WishlistService } from '../wishlist/service/wishlist.service';
import { QueryService } from '../database/query';
import { Plan } from '../plan/entities/plan.entity';
import { NotificationService } from '../notification/notification.service';
import { RealtimeService } from '../realtime/realtime.service';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailService } from '../verification/services/email.service';
import { TokenService } from './services/token.service';
import { AuthSessionService, AuthTokenResult } from './services/auth-session.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { USER_POPULATE } from './constants/user-populate.constant';
import type { JwtPayload } from 'jsonwebtoken';

/** How long a just-rotated refresh token is still accepted, so concurrent refreshes converge instead of logging the user out. */
const REFRESH_TOKEN_GRACE_MS = 30_000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: PaginateModel<User>,
    @InjectModel(PasswordResetToken.name) private readonly passwordResetTokenModel: Model<PasswordResetToken>,
    @Inject(forwardRef(() => UserService)) private readonly userService: UserService,
    @Inject(forwardRef(() => WalletService)) private readonly walletService: WalletService,
    @Inject(forwardRef(() => WishlistService)) private readonly wishlistService: WishlistService,
    @Inject(forwardRef(() => OrganizationService)) private readonly organizationService: OrganizationService,
    @Inject(forwardRef(() => SubscriptionService)) private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => NotificationService)) private readonly notificationService: NotificationService,
    private readonly realtimeService: RealtimeService,
    private readonly query: QueryService,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    private readonly authSessionService: AuthSessionService
  ) {}

  async register(registerDto: RegisterDto) {
    const session = await this.connection.startSession();
    session.startTransaction();

    const userType = registerDto.userDto.roleName;
    const isStudent = userType === Roles.STUDENT;
    const isParent = userType === Roles.PARENT;

    try {
      const { userDto, organizationDto } = registerDto;

      const userId = new mongoose.Types.ObjectId();
      const organizationId = new mongoose.Types.ObjectId();
      const walletId = new mongoose.Types.ObjectId();

      // Users who register with role ORGANIZATION become the SUPER_ADMIN of that org.
      let roleName: Roles;
      if (isStudent) {
        roleName = Roles.STUDENT;
      } else if (isParent) {
        roleName = Roles.PARENT;
      } else {
        roleName = Roles.SUPER_ADMIN;
      }

      const foundedRole = await this.query.findOneOrThrow<Role>(Role.name, { name: roleName }, AuthErrors.ROLE_NOT_FOUND_CREATE_FIRST);

      const freePlan = await this.query.findOneOrThrow<Plan>(
        Plan.name,
        { $or: [{ tier: 'FREE' }, { name: 'FREE' }] },
        AuthErrors.FREE_PLAN_NOT_FOUND_CREATE_FIRST
      );

      const user = await this.userService.create(
        {
          ...userDto,
          _id: userId,
          walletId,
          organizationId: isStudent || isParent ? undefined : organizationId,
          roleName: foundedRole.name,
          status: UserStatus.ACTIVE,
          onboardingComplete: true,
          organizationOnboarded: !isStudent && !isParent ? false : undefined,
          authProvider: 'local',
        },
        session
      );

      await user.populate('role');

      await this.walletService.create({ _id: walletId, userId: userId, currency: user.preferredCurrency }, session);

      if (!isStudent && !isParent) {
        await this.organizationService.create(
          {
            ...organizationDto!,
            superAdminId: userId,
            _id: organizationId,
            planName: freePlan.name,
          },
          session
        );
        await this.subscriptionService.create(
          {
            organizationId: organizationId.toString(),
            planId: (freePlan as { _id: mongoose.Types.ObjectId })._id.toString(),
            billingCycle: BillingCycle.ONE_TIME,
            startsAt: new Date(),
            billing: {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phoneNumber: user.phone,
              amount: 0,
              currency: user.preferredCurrency,
              billingCycle: BillingCycle.ONE_TIME,
            },
          },
          session
        );
      }

      if (isStudent) {
        await this.createAutoParentForStudent({ student: user, studentId: userId, plainPassword: userDto.password!, session });
      }

      if (isParent) {
        await this.createAutoChildForParent({ parent: user, parentId: userId, plainPassword: userDto.password!, session });
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

      if (registerDto.wishlistCourseIds && registerDto.wishlistCourseIds.length > 0) {
        const userIdString = userId.toString();
        void this.wishlistService.createMany({ courseIds: registerDto.wishlistCourseIds, userId: userIdString }).catch((error) => {
          this.logger.error('Error creating wishlist items during registration', error);
        });
      }

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

  private async createAutoParentForStudent(opts: {
    student: { _id: mongoose.Types.ObjectId; username: string; preferredCurrency: string };
    studentId: mongoose.Types.ObjectId;
    plainPassword: string;
    session: import('mongoose').ClientSession;
  }): Promise<void> {
    const { student, studentId, plainPassword, session } = opts;
    const parentId = new mongoose.Types.ObjectId();
    const parentWalletId = new mongoose.Types.ObjectId();
    const randomSuffix = randomBytes(3).toString('hex');

    const parentUsername = `parent_${student.username}`;
    const parentEmail = `parent_${student.username}_${randomSuffix}@safeerlms.com`;
    const parentPhone = `+10000${randomBytes(4).readUInt32BE(0).toString().slice(0, 7)}`;

    const parentRole = await this.query.findOneOrThrow<Role>(Role.name, { name: Roles.PARENT }, AuthErrors.ROLE_NOT_FOUND_CREATE_FIRST);

    const parent = await this.userService.create(
      {
        _id: parentId,
        walletId: parentWalletId,
        username: parentUsername,
        email: parentEmail,
        phone: parentPhone,
        password: plainPassword,
        firstName: 'Parent',
        lastName: `of ${student.username}`,
        roleName: parentRole.name,
        preferredCurrency: student.preferredCurrency as Currency,
        status: UserStatus.ACTIVE,
        childUsersIds: [studentId],
        passwordLastUpdated: null,
        onboardingComplete: true,
        authProvider: 'local',
      },
      session
    );

    await this.walletService.create({ _id: parentWalletId, userId: parentId, currency: parent.preferredCurrency }, session);

    await this.userModel.updateOne({ _id: studentId }, { $set: { parentUserId: parentId } }, { session });
  }

  private async createAutoChildForParent(opts: {
    parent: { _id: mongoose.Types.ObjectId; username: string; preferredCurrency: string };
    parentId: mongoose.Types.ObjectId;
    plainPassword: string;
    session: import('mongoose').ClientSession;
  }): Promise<void> {
    const { parent, parentId, plainPassword, session } = opts;
    const childId = new mongoose.Types.ObjectId();
    const childWalletId = new mongoose.Types.ObjectId();
    const randomSuffix = randomBytes(3).toString('hex');

    const childUsername = `child_${parent.username}_1`;
    const childEmail = `child_${parent.username}_${randomSuffix}@safeerlms.com`;
    const childPhone = `+20000${randomBytes(4).readUInt32BE(0).toString().slice(0, 7)}`;

    const studentRole = await this.query.findOneOrThrow<Role>(Role.name, { name: Roles.STUDENT }, AuthErrors.ROLE_NOT_FOUND_CREATE_FIRST);

    await this.userService.create(
      {
        _id: childId,
        walletId: childWalletId,
        username: childUsername,
        email: childEmail,
        phone: childPhone,
        password: plainPassword,
        firstName: 'Child',
        lastName: `of ${parent.username}`,
        roleName: studentRole.name,
        preferredCurrency: parent.preferredCurrency as Currency,
        status: UserStatus.ACTIVE,
        parentUserId: parentId,
        passwordLastUpdated: null,
        onboardingComplete: true,
        authProvider: 'local',
      },
      session
    );

    await this.walletService.create({ _id: childWalletId, userId: childId, currency: parent.preferredCurrency }, session);

    await this.userModel.updateOne({ _id: parentId }, { $set: { childUsersIds: [childId] } }, { session });
  }

  async login(loginDto: LoginDto): Promise<AuthTokenResult> {
    try {
      const { identifier, password } = loginDto;
      const foundedUser = await this.query.findOne<User>(
        User.name,
        mongoose.Types.ObjectId.isValid(identifier)
          ? { _id: identifier, deletedAt: null }
          : { deletedAt: null, $or: [{ email: identifier }, { username: identifier }, { phone: identifier }] },
        {
          populate: [...USER_POPULATE],
        }
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
      const foundedUser = await this.query.findOne<User>(User.name, { _id, activeSessionId: sid, deletedAt: null }, { populate: [...USER_POPULATE] });
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
      // Atomically rotate, but only if this request still holds the *current*
      // refresh-token id. Concurrent refreshes (e.g. the proxy and
      // createAuthorizedNatsRequest both reacting to an expired access token at
      // once) then fall into the grace branch below instead of racing each other
      // into a logout.
      const rotation = await this.userModel.updateOne(
        { _id, activeSessionId: sid, activeRefreshTokenId: rtid },
        { $set: { previousRefreshTokenId: rtid, activeRefreshTokenId: newRtid, refreshTokenRotatedAt: new Date() } }
      );

      let effectiveRtid: string;
      if (rotation.modifiedCount === 1) {
        effectiveRtid = newRtid;
      } else {
        // No rotation happened: either a concurrent request just rotated this
        // exact token (accept it through a short grace window and converge on the
        // winner's token) or the token is genuinely revoked/superseded.
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

      const foundedUser = await this.query.findOne<User>(User.name, { _id, activeSessionId: sid, deletedAt: null }, { populate: [...USER_POPULATE] });
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

  async requestPasswordReset(email: string, client: PasswordResetClient = PasswordResetClient.WEB): Promise<{ message: string }> {
    const isMobile = client === PasswordResetClient.MOBILE;
    const successMessage = isMobile ? AuthSuccessMessages.PASSWORD_RESET_OTP_SENT : AuthSuccessMessages.PASSWORD_RESET_LINK_SENT;

    const user = await this.userModel.findOne({ email: email.toLowerCase(), deletedAt: null }).lean();
    if (!user) {
      return { message: successMessage };
    }

    const lastToken = await this.passwordResetTokenModel.findOne({ userId: user._id }, null, { sort: { createdAt: -1 } }).lean();

    if (lastToken) {
      const elapsed = Date.now() - new Date(lastToken.createdAt).getTime();
      if (elapsed < PASSWORD_RESET.COOLDOWN_MS) {
        const remaining = Math.ceil((PASSWORD_RESET.COOLDOWN_MS - elapsed) / 1000);
        throw new BadRequestException(`${AuthErrors.PASSWORD_RESET_COOLDOWN}|${remaining}`);
      }
    }

    await this.passwordResetTokenModel.deleteMany({ userId: user._id });

    const userName = user.firstName ? `${user.firstName}` : undefined;

    if (isMobile) {
      const otp = this.generatePasswordResetOtp();
      const hashedToken = await bcrypt.hash(otp, 10);

      await this.passwordResetTokenModel.create({
        userId: user._id,
        email: user.email,
        hashedToken,
        channel: PasswordResetChannel.OTP,
        failedAttempts: 0,
      });

      try {
        await this.emailService.sendPasswordResetOtpEmail(user.email, otp, userName);
      } catch {
        await this.passwordResetTokenModel.deleteMany({ userId: user._id });
        throw new BadRequestException(AuthErrors.PASSWORD_RESET_EMAIL_SEND_FAILED);
      }

      return { message: successMessage };
    }

    const frontendUrl = process.env.SECURED_CLIENT_BASE_URL ?? 'https://safeerlms.com';
    const rawToken = randomBytes(48).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);

    await this.passwordResetTokenModel.create({
      userId: user._id,
      email: user.email,
      hashedToken,
      channel: PasswordResetChannel.LINK,
      failedAttempts: 0,
    });

    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetLink, userName);
    } catch {
      await this.passwordResetTokenModel.deleteMany({ userId: user._id });
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_EMAIL_SEND_FAILED);
    }

    return { message: successMessage };
  }

  /**
   * Mobile flow: verify the emailed OTP and exchange it for a short-lived reset token
   * used by {@link resetPassword}.
   */
  async verifyPasswordResetOtp(email: string, otp: string): Promise<VerifyPasswordResetOtpResponse> {
    const user = await this.userModel.findOne({ email: email.toLowerCase(), deletedAt: null }).lean();
    if (!user) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_TOKEN_INVALID);
    }

    const storedToken = await this.passwordResetTokenModel.findOne({ userId: user._id }, null, { sort: { createdAt: -1 } });

    if (!storedToken || storedToken.channel !== PasswordResetChannel.OTP) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_EXPIRED);
    }

    const maxAttempts = RATE_LIMIT.PASSWORD_RESET_BRUTE_FORCE.MAX_FAILED_ATTEMPTS;
    if (storedToken.failedAttempts >= maxAttempts) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_ACCOUNT_LOCKED);
    }

    const isValid = await bcrypt.compare(otp, storedToken.hashedToken);
    if (!isValid) {
      storedToken.failedAttempts = (storedToken.failedAttempts ?? 0) + 1;
      await storedToken.save();

      if (storedToken.failedAttempts >= maxAttempts) {
        throw new BadRequestException(AuthErrors.PASSWORD_RESET_ACCOUNT_LOCKED);
      }
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_TOKEN_INVALID);
    }

    const resetToken = randomBytes(48).toString('hex');
    storedToken.hashedToken = await bcrypt.hash(resetToken, 10);
    storedToken.channel = PasswordResetChannel.LINK;
    storedToken.failedAttempts = 0;
    await storedToken.save();

    return {
      message: AuthSuccessMessages.PASSWORD_RESET_OTP_VERIFIED,
      resetToken,
      email: user.email,
    };
  }

  async resetPassword(token: string, email: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: email.toLowerCase(), deletedAt: null }).lean();
    if (!user) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_TOKEN_INVALID);
    }

    const storedToken = await this.passwordResetTokenModel.findOne({ userId: user._id }, null, { sort: { createdAt: -1 } });

    if (!storedToken) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_EXPIRED);
    }

    // Mobile OTP must be exchanged via verifyPasswordResetOtp before resetting.
    if (storedToken.channel === PasswordResetChannel.OTP) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_TOKEN_INVALID);
    }

    const maxAttempts = RATE_LIMIT.PASSWORD_RESET_BRUTE_FORCE.MAX_FAILED_ATTEMPTS;
    if (storedToken.failedAttempts >= maxAttempts) {
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_ACCOUNT_LOCKED);
    }

    const isValid = await bcrypt.compare(token, storedToken.hashedToken);
    if (!isValid) {
      storedToken.failedAttempts = (storedToken.failedAttempts ?? 0) + 1;
      await storedToken.save();

      if (storedToken.failedAttempts >= maxAttempts) {
        throw new BadRequestException(AuthErrors.PASSWORD_RESET_ACCOUNT_LOCKED);
      }
      throw new BadRequestException(AuthErrors.PASSWORD_RESET_TOKEN_INVALID);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.userModel.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, passwordLastUpdated: new Date(), activeSessionId: null, activeRefreshTokenId: null } }
    );

    await this.passwordResetTokenModel.deleteMany({ userId: user._id });

    return { message: AuthSuccessMessages.PASSWORD_RESET_SUCCESS };
  }

  private generatePasswordResetOtp(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < PASSWORD_RESET.OTP_LENGTH; i++) {
      otp += digits[randomInt(digits.length)];
    }
    return otp;
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException(UserErrors.USER_NOT_FOUND);
    const phoneUser = await this.userModel.findOne({ phone: dto.phone });
    if (phoneUser) throw new BadRequestException(AuthErrors.PHONE_TAKEN);

    if (user.onboardingComplete === true) throw new ForbiddenException(AuthErrors.ONBOARDING_ALREADY_COMPLETED);

    // Only STUDENT and PARENT skip the organisation creation step.
    // SUPER_ADMIN (displayed as "Organisation / Teacher") always creates one.
    const isStudent = dto.roleName === Roles.STUDENT;
    const isParent = dto.roleName === Roles.PARENT;
    const needsOrganization = !isStudent && !isParent;

    if (needsOrganization && !dto.organizationDto) {
      throw new BadRequestException(AuthErrors.ORGANIZATION_DTO_REQUIRED_FOR_ROLE);
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const freePlan = await this.query.findOneOrThrow<Plan>(
        Plan.name,
        { $or: [{ tier: PlanTier.FREE }, { name: 'Free Plan' }] },
        AuthErrors.FREE_PLAN_NOT_FOUND_CREATE_FIRST
      );

      const organizationId = needsOrganization ? new mongoose.Types.ObjectId() : undefined;

      user.roleName = dto.roleName;
      user.phone = dto.phone;
      if (dto.firstName) user.firstName = dto.firstName;
      if (dto.lastName) user.lastName = dto.lastName;
      if (organizationId) user.organizationId = organizationId;
      if (dto.preferredCurrency) {
        user.preferredCurrency = dto.preferredCurrency;
        await this.walletService.changeCurrency(user.walletId, dto.preferredCurrency, session);
      }
      user.onboardingComplete = true;
      if (needsOrganization) {
        user.organizationOnboarded = false;
      }

      await user.save({ session });

      if (needsOrganization && organizationId) {
        await this.organizationService.create(
          {
            ...dto.organizationDto!,
            superAdminId: user._id,
            _id: organizationId,
            planName: freePlan.name,
            settings: {
              branding: { logo: '', primaryColor: '#000000', secondaryColor: '#ffffff' },
            },
            // Google already verified the email, so the wizard only needs the
            // identity step. Account stays PENDING (default) until admin approval.
            verification: {
              email: { verified: true, verifiedAt: new Date(), failedAttempts: 0, lockedUntil: null },
              identity: {
                status: VerificationStatus.UNVERIFIED,
                documentType: null,
                fileKeys: [],
                rejectionMessage: null,
                submittedAt: null,
                reviewedBy: null,
                reviewedAt: null,
              },
            },
          },
          session
        );

        await this.subscriptionService.create(
          {
            organizationId: organizationId.toString(),
            planId: (freePlan as { _id: mongoose.Types.ObjectId })._id.toString(),
            billingCycle: BillingCycle.ONE_TIME,
            startsAt: new Date(),
            billing: null,
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
