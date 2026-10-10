import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { QueryService } from 'src/database/query';
import { User } from 'src/user/entities/user.entity';

export interface RealtimeSessionUser {
  userId: string;
  sid: string;
}

@Injectable()
export class RealtimeSessionAuthService {
  private readonly secret = process.env.JSON_PRIVATE_KEY ?? '';

  constructor(private readonly query: QueryService) {}

  async verify(token: string): Promise<RealtimeSessionUser> {
    const decoded = jwt.verify(token, this.secret) as { _id?: string; sid?: string };
    if (!decoded._id || !decoded.sid) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.query.findOne<User>(User.name, {
      _id: decoded._id,
      activeSessionId: decoded.sid,
      deletedAt: null,
    });
    if (!user) {
      throw new UnauthorizedException('Authentication failed');
    }

    return {
      userId: user._id.toString(),
      sid: decoded.sid,
    };
  }
}
