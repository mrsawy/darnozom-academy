import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  override getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const state = typeof req?.query?.state === 'string' ? req.query.state : undefined;

    // Pass the redirect destination through Google's `state` echo parameter so
    // we don't rely on session cookies surviving the external browser hop.
    return state ? { state } : {};
  }
}
