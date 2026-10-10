import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { UserDocument } from 'src/user/entities/user.entity';
import { EnrollmentService } from '../services/enrollment.service';

interface RpcContextWithUser {
  userPayload?: UserDocument;
}

/**
 * Blocks access when the enrollment's subscription has expired.
 *
 * Reads `enrollmentId` from:
 * - HTTP: `req.body.enrollmentId`
 * - RPC: `data.enrollmentId`
 *
 * Must be placed **after** `AuthGuard` so the user context is populated.
 * Routes without `enrollmentId` pass through unchanged.
 */
@Injectable()
export class ActiveEnrollmentGuard implements CanActivate {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isHttp = context.getType() === 'http';
    const isRpc = context.getType() === 'rpc';

    if (!isHttp && !isRpc) return true;

    const { enrollmentId, userId } = isHttp ? this.extractFromHttp(context) : this.extractFromRpc(context);

    if (!enrollmentId || !userId) return true;

    try {
      await this.enrollmentService.assertEnrollmentIsActive(enrollmentId, userId);
    } catch (error) {
      if (!isHttp && error instanceof ForbiddenException) {
        throw new RpcException(error.message);
      }
      throw error;
    }

    return true;
  }

  private extractFromHttp(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user?: UserDocument; body?: { enrollmentId?: string } }>();
    return {
      enrollmentId: req.body?.enrollmentId,
      userId: req.user?._id?.toString(),
    };
  }

  private extractFromRpc(context: ExecutionContext) {
    const rpcContext = context.switchToRpc().getContext<RpcContextWithUser>();
    const data = context.switchToRpc().getData<{ enrollmentId?: string }>();
    return {
      enrollmentId: data?.enrollmentId,
      userId: rpcContext.userPayload?._id?.toString(),
    };
  }
}
