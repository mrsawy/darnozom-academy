import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { AuthErrors, Roles, NotificationType, NotificationTextKey } from '@lms-organization/shared-types';
import { User, UserDocument } from '../../user/entities/user.entity';
import { Role } from '../../role/entities/role.entity';
import { TokenService } from './token.service';
import { NotificationService } from '../../notification/notification.service';
import { RealtimeService } from '../../realtime/realtime.service';
import { RealtimeEvents } from '../../realtime/realtime.constants';

export interface AuthTokenResult {
  access_token: string;
  refresh_token: string;
  sid: string;
  user: Record<string, unknown>;
}

@Injectable()
export class AuthSessionService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly tokenService: TokenService,
    @Inject(forwardRef(() => NotificationService)) private readonly notificationService: NotificationService,
    private readonly realtimeService: RealtimeService
  ) {}

  /**
   * Rotates the active session/refresh-token IDs for a user, generates new JWT
   * access + refresh tokens, and emits a real-time kick event to the previous
   * session when the user is a STUDENT (single-session enforcement).
   */
  async rotateSessionAndIssueTokens(user: UserDocument & { role: Role }, previousSid: string | null = null): Promise<AuthTokenResult> {
    const sid = randomUUID();
    const rtid = randomUUID();
    const now = new Date();

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          activeSessionId: sid,
          activeRefreshTokenId: rtid,
          previousRefreshTokenId: null,
          refreshTokenRotatedAt: now,
          activeSessionUpdatedAt: now,
          lastLogin: now,
        },
      }
    );

    const doc = user as unknown as UserDocument;
    const userObject: Record<string, unknown> = doc.toObject ? (doc.toObject() as Record<string, unknown>) : ({ ...user } as Record<string, unknown>);
    const payload: Record<string, unknown> = { ...userObject, password: undefined, activeSessionId: sid };

    const access_token = this.tokenService.generateToken({ _id: user._id.toString(), sid });
    const refresh_token = this.tokenService.generateRefreshToken({ _id: user._id.toString(), sid, rtid });

    if (previousSid && previousSid !== sid && user.roleName === Roles.STUDENT) {
      const userId = user._id.toString();
      await this.notificationService.create({
        userId,
        titleKey: NotificationTextKey.SECURITY_LOGGED_OUT_TITLE,
        bodyKey: NotificationTextKey.SECURITY_LOGGED_OUT_BODY,
        type: NotificationType.SECURITY,
      });
      const kickPayload = {
        message: AuthErrors.ACCOUNT_LOGGED_OUT_FROM_ANOTHER_DEVICE,
        loggedOutAt: now.toISOString(),
        targetSid: previousSid,
      };
      await this.realtimeService.emitToSession(previousSid, RealtimeEvents.AUTH_SESSION_REPLACED, kickPayload);
      await this.realtimeService.emitToUser(userId, RealtimeEvents.AUTH_SESSION_REPLACED, kickPayload);
    }

    return { access_token, refresh_token, sid, user: payload };
  }
}
