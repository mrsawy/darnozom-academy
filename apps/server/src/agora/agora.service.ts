import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import { MeetingProvider, Roles } from '@darnozom/shared-types';
import { CourseContent } from 'src/course/entities/course-content.entity';
import type { LiveSession } from 'src/course/entities/liveSession.schema';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { SessionBooking } from 'src/private-session/entities/session-booking.entity';
import { ContentType } from 'src/course/enum/contentType.enum';
import { BookingStatus } from 'src/private-session/enums/booking-status.enum';
import { isJoinable } from 'src/private-session/utils/session-time.util';
import type { IssueLiveSessionTokenDto } from './dto/issue-live-session-token.dto';
import type { IssuePrivateSessionTokenDto } from './dto/issue-private-session-token.dto';
import { UserDocument } from 'src/user/entities/user.entity';

export type AgoraRtcRole = 'publisher' | 'subscriber';

export interface AgoraTokenResult {
  appId: string;
  channelName: string;
  uid: number;
  token: string;
  expiresAt: number;
}

const TOKEN_TTL_SECONDS = 3600;
const EARLY_JOIN_SECONDS = 15 * 60;

/** FNV-1a 32-bit hash → deterministic uint32 uid derived from full userId. No collisions from partial hex slicing. */
function userIdToAgoraUid(userId: string): number {
  let hash = 0x81_1c_9d_c5;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.codePointAt(i) ?? 0;
    hash = Math.imul(hash, 0x01_00_01_93) >>> 0;
  }
  return hash || 1;
}

@Injectable()
export class AgoraService {
  private readonly appId: string;
  private readonly appCertificate: string;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(CourseContent.name) private readonly contentModel: Model<CourseContent>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<Enrollment>,
    @InjectModel(SessionBooking.name) private readonly bookingModel: Model<SessionBooking>
  ) {
    this.appId = this.config.getOrThrow<string>('AGORA_APP_ID');
    this.appCertificate = this.config.getOrThrow<string>('AGORA_APP_CERTIFICATE');
  }

  async issueLiveSessionToken(user: UserDocument, dto: IssueLiveSessionTokenDto): Promise<AgoraTokenResult> {
    if (!Types.ObjectId.isValid(dto.contentId)) {
      throw new BadRequestException('Invalid content ID');
    }

    const content = await this.contentModel.findById(dto.contentId).lean();
    if (!content) throw new NotFoundException('Live session not found');
    if (content.type !== ContentType.LIVE_SESSION) {
      throw new BadRequestException('Content is not a live session');
    }

    // Safe cast: discriminator guarantees LiveSession fields exist after LIVE_SESSION check
    const session = content as typeof content & LiveSession;

    if (session.provider !== MeetingProvider.AGORA) {
      throw new BadRequestException('This content is not configured for in-app calling');
    }
    if (!session.agoraChannelName) {
      throw new BadRequestException('Agora channel not configured for this session');
    }

    const start = new Date(session.startDate).getTime();
    const end = new Date(session.endDate).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end)) {
      const now = Date.now();
      if (now < start - EARLY_JOIN_SECONDS * 1000 || now > end) {
        throw new BadRequestException('Session is not currently active');
      }
    }

    if (user.roleName == Roles.STUDENT && dto.enrollmentId) {
      if (!Types.ObjectId.isValid(dto.enrollmentId)) {
        throw new BadRequestException('Invalid enrollment ID');
      }
      const enrollment = await this.enrollmentModel
        .findOne({
          _id: new Types.ObjectId(dto.enrollmentId),
          userId: new Types.ObjectId(user._id.toString()),
        })
        .lean();
      if (!enrollment) throw new ForbiddenException('Not enrolled in this course');
    }

    return this.issueRtcToken(session.agoraChannelName, userIdToAgoraUid(user._id.toString()), 'publisher');
  }

  async issuePrivateSessionToken(userId: string, dto: IssuePrivateSessionTokenDto): Promise<AgoraTokenResult> {
    if (!Types.ObjectId.isValid(dto.bookingId)) {
      throw new BadRequestException('Invalid booking ID');
    }

    const booking = await this.bookingModel.findById(dto.bookingId).lean();
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking is not confirmed');
    }
    if (booking.provider !== MeetingProvider.AGORA) {
      throw new BadRequestException('This booking is not configured for in-app calling');
    }
    if (!booking.agoraChannelName) {
      throw new BadRequestException('Agora channel not configured for this booking');
    }

    if (!isJoinable(booking.startsAt, booking.endsAt)) {
      throw new BadRequestException('Session is not currently active');
    }

    const isParticipant =
      booking.instructorId.toString() === userId || booking.studentId.toString() === userId || booking.parentId?.toString() === userId;
    if (!isParticipant) throw new ForbiddenException('Not authorized to join this session');

    return this.issueRtcToken(booking.agoraChannelName, userIdToAgoraUid(userId), 'publisher');
  }

  issueRtcToken(channelName: string, uid: number, role: AgoraRtcRole): AgoraTokenResult {
    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    const token = RtcTokenBuilder.buildTokenWithUid(this.appId, this.appCertificate, channelName, uid, agoraRole, expiresAt, expiresAt);
    return { appId: this.appId, channelName, uid, token, expiresAt };
  }
}
