import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthErrors } from '@lms-organization/shared-types';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = configService.get<string>('JSON_PRIVATE_KEY') ?? '';
    this.expiresIn = configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') ?? configService.get<string>('AUTH_EXPIRES_IN') ?? '15m';
    this.refreshSecret = configService.get<string>('REFRESH_TOKEN_SECRET') ?? this.secret + '_refresh';
    this.refreshExpiresIn = configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') ?? '7d';
  }

  generateToken(payload: { _id: string; sid: string }): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  generateRefreshToken(payload: { _id: string; sid: string; rtid: string }): string {
    return jwt.sign(payload, this.refreshSecret, { expiresIn: this.refreshExpiresIn });
  }

  verifyAccessToken(token: string): { _id: string; sid: string } {
    try {
      const decoded = jwt.verify(token, this.secret) as { _id?: string; sid?: string };
      if (!decoded._id || !decoded.sid) {
        throw new UnauthorizedException(AuthErrors.TOKEN_INVALID);
      }
      return { _id: decoded._id, sid: decoded.sid };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') throw new UnauthorizedException(AuthErrors.TOKEN_EXPIRED);
        if (error.name === 'JsonWebTokenError') throw new UnauthorizedException(AuthErrors.TOKEN_INVALID);
      }
      throw new UnauthorizedException(AuthErrors.AUTHENTICATION_FAILED);
    }
  }

  verifyRefreshToken(token: string): { _id: string; sid: string; rtid: string } {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as { _id?: string; sid?: string; rtid?: string };
      if (!decoded._id || !decoded.sid || !decoded.rtid) {
        throw new UnauthorizedException(AuthErrors.TOKEN_INVALID);
      }
      return { _id: decoded._id, sid: decoded.sid, rtid: decoded.rtid };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') throw new UnauthorizedException(AuthErrors.REFRESH_TOKEN_EXPIRED);
        if (error.name === 'JsonWebTokenError') throw new UnauthorizedException(AuthErrors.TOKEN_INVALID);
      }
      throw new UnauthorizedException(AuthErrors.REFRESH_FAILED);
    }
  }

  decode(token: string): jwt.JwtPayload | string | null {
    return jwt.decode(token);
  }
}
