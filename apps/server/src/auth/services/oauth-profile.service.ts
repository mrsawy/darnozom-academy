import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model } from 'mongoose';
import { randomBytes } from 'node:crypto';
import { AuthErrors, Roles } from '@islamic-academy/shared-types';
import { User, UserDocument } from '../../user/entities/user.entity';
import { Role } from '../../role/entities/role.entity';
import { QueryService } from '../../database/query.service';
import { USER_POPULATE } from '../constants/user-populate.constant';

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
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly query: QueryService
  ) {}

  /**
   * Resolves a Google profile to a fully populated user document:
   * - Returns existing user matched by googleId.
   * - Links googleId and returns existing user matched by verified email.
   * - Creates a new GUEST user (no phone, no password) for first-time Google sign-ins.
   */
  async findOrCreateGoogleUser(profile: GoogleProfile): Promise<UserDocument & { role: Role }> {
    if (!profile.emailVerified) {
      throw new InternalServerErrorException(AuthErrors.GOOGLE_AUTH_FAILED);
    }

    const byGoogleId = await this.query.findOne<User>(User.name, { googleId: profile.providerId, deletedAt: null }, { populate: USER_POPULATE.map((p) => p.path) });
    if (byGoogleId) {
      return (byGoogleId as UserDocument).toObject() as unknown as UserDocument & { role: Role };
    }

    const deletedByGoogleId = await this.userModel.findOne({ googleId: profile.providerId, deletedAt: { $ne: null } }).select('_id').lean();
    if (deletedByGoogleId) {
      throw new UnauthorizedException(AuthErrors.AUTHENTICATION_FAILED);
    }

    const byEmail = await this.userModel.findOne({ email: profile.email.toLowerCase(), deletedAt: null });
    if (byEmail) {
      byEmail.googleId = profile.providerId;
      byEmail.authProvider ??= 'google';
      await byEmail.save();
      await byEmail.populate(USER_POPULATE.map((p) => p.path));
      return byEmail.toObject() as unknown as UserDocument & { role: Role };
    }

    const deletedByEmail = await this.userModel.findOne({ email: profile.email.toLowerCase(), deletedAt: { $ne: null } }).select('_id').lean();
    if (deletedByEmail) {
      throw new UnauthorizedException(AuthErrors.AUTHENTICATION_FAILED);
    }

    return this.createGuestUser(profile);
  }

  private async createGuestUser(profile: GoogleProfile): Promise<UserDocument & { role: Role }> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const userId = new mongoose.Types.ObjectId();
      const shortId = randomBytes(4).toString('hex');
      const username = `google_${shortId}`;

      const user = new this.userModel({
        _id: userId,
        username,
        email: profile.email.toLowerCase(),
        firstName: profile.firstName,
        lastName: profile.lastName,
        googleId: profile.providerId,
        authProvider: 'google',
        roleName: Roles.GUEST,
        onboardingComplete: false,
      });

      await user.save({ session });
      await session.commitTransaction();
      await session.endSession();

      await user.populate(USER_POPULATE.map((p) => p.path));

      return user.toObject() as unknown as UserDocument & { role: Role };
    } catch (error) {
      await session.abortTransaction();
      await session.endSession();
      throw error;
    }
  }
}
