import { Injectable, InternalServerErrorException, UnauthorizedException, forwardRef, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, PaginateModel } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { AuthErrors, Currency, Roles } from '@lms-organization/shared-types';
import { USER_CREATED_FOR_AI_EVENT, UserCreatedForAiEvent } from '../../ai-subscription/events/user-created-for-ai.event';
import { User, UserDocument } from '../../user/entities/user.entity';
import { Role } from '../../role/entities/role.entity';
import { WalletService } from '../../wallet/wallet.service';
import { QueryService } from '../../database/query';
import { USER_POPULATE } from '../constants/user-populate.constant';
import { withDeletedQueryOptions } from '../../user/utils/not-deleted-user.filter';

export interface GoogleProfile {
  providerId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  picture?: string;
}

@Injectable()
export class OAuthProfileService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: PaginateModel<User>,
    @Inject(forwardRef(() => WalletService)) private readonly walletService: WalletService,
    private readonly query: QueryService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Resolves a Google profile to a fully populated user document:
   * - Returns existing user matched by googleId.
   * - Links googleId and returns existing user matched by verified email.
   * - Creates a new GUEST user (no phone, no password) for first-time Google sign-ins.
   */
  async findOrCreateGoogleUser(profile: GoogleProfile): Promise<UserDocument & { role: Role }> {
    if (!profile.emailVerified) {
      throw new InternalServerErrorException(AuthErrors.GOOGLE_EMAIL_NOT_VERIFIED);
    }

    // 1. Find by googleId (returning user)
    const byGoogleId = await this.query.findOne<User>(User.name, { googleId: profile.providerId, deletedAt: null }, { populate: [...USER_POPULATE] });
    if (byGoogleId) {
      return byGoogleId.toObject() as unknown as UserDocument & { role: Role };
    }

    const deletedByGoogleId = await this.userModel
      .findOne({ googleId: profile.providerId, deletedAt: { $ne: null } })
      .setOptions(withDeletedQueryOptions())
      .select('_id')
      .lean();
    if (deletedByGoogleId) {
      throw new UnauthorizedException(AuthErrors.ACCOUNT_DISABLED);
    }

    // 2. Find by email (account linking)
    const byEmail = await this.userModel.findOne({ email: profile.email.toLowerCase(), deletedAt: null });
    if (byEmail) {
      byEmail.googleId = profile.providerId;
      byEmail.authProvider ??= 'google';
      await byEmail.save();
      await byEmail.populate([...USER_POPULATE]);
      return byEmail.toObject() as unknown as UserDocument & { role: Role };
    }

    const deletedByEmail = await this.userModel
      .findOne({ email: profile.email.toLowerCase(), deletedAt: { $ne: null } })
      .setOptions(withDeletedQueryOptions())
      .select('_id')
      .lean();
    if (deletedByEmail) {
      throw new UnauthorizedException(AuthErrors.ACCOUNT_DISABLED);
    }

    // 3. New user — create GUEST with minimal data
    return await this.createGuestUser(profile);
  }

  private async createGuestUser(profile: GoogleProfile): Promise<UserDocument & { role: Role }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const userId = new mongoose.Types.ObjectId();
      const walletId = new mongoose.Types.ObjectId();
      const shortId = randomBytes(4).toString('hex');
      const username = `google_${shortId}`;

      const user = new this.userModel({
        _id: userId,
        walletId,
        username,
        email: profile.email.toLowerCase(),
        firstName: profile.firstName,
        lastName: profile.lastName,
        profile: { avatar: profile.picture },
        googleId: profile.providerId,
        authProvider: 'google',
        roleName: Roles.GUEST,
        onboardingComplete: false,
        preferredCurrency: Currency.DEFAULT,
      });

      await user.save({ session });

      await this.walletService.create({ _id: walletId, userId, currency: Currency.DEFAULT }, session);

      await session.commitTransaction();
      await session.endSession();

      this.eventEmitter.emit(USER_CREATED_FOR_AI_EVENT, new UserCreatedForAiEvent(userId.toString()));

      await user.populate([...USER_POPULATE]);

      return user.toObject() as unknown as UserDocument & { role: Role };
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  }
}
