import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { AuthErrors } from '@darnozom/shared-types';
import { SKIP_ONBOARDING_CHECK_KEY } from '../decorators/skip-onboarding-check.decorator';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { AuthService } from '../auth.service';
import { UserDocument } from 'src/user/entities/user.entity';
import { Role } from 'src/role/entities/role.entity';
import { CaslAbilityFactory } from 'src/role/permissions.factory';

interface RequestWithUser {
  headers: { authorization?: string };
  user?: { onboardingComplete?: boolean; ability?: unknown };
}

/**
 * Blocks requests from authenticated users who have not completed onboarding
 * (`onboardingComplete === false`), e.g. new Google OAuth users with role GUEST.
 *
 * Registered as a global guard, so it runs *before* route-level `@UseGuards(AuthGuard)`.
 * When `request.user` is not set yet, this guard resolves the user from the Bearer
 * token (same as AuthGuard) so the onboarding check still applies.
 *
 * Use `@SkipOnboardingCheck()` on routes that must stay reachable before onboarding
 * (OAuth callback redirect target, onboarding completion, `GET /user/user-data`, etc.).
 */
@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly caslAbilityFactory: CaslAbilityFactory
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ONBOARDING_CHECK_KEY, [context.getHandler(), context.getClass()]);

    if (skip) return true;

    if (context.getType() === 'http') {
      return await this.checkHttp(context);
    }

    if (context.getType() === 'rpc') {
      return this.checkRpc(context);
    }

    return true;
  }

  private async checkHttp(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    let user = request.user as { onboardingComplete?: boolean } | undefined;

    if (!user) {
      const token = this.extractBearer(request);
      if (token) {
        try {
          const payload = (await this.authService.verifyToken(token)) as UserDocument & { role: Role };
          const ability = this.caslAbilityFactory.createForUser(payload).rules;
          request.user = { ...payload, ability } as RequestWithUser['user'];
          user = request.user as { onboardingComplete?: boolean };
        } catch {
          // No valid session — treat as unauthenticated; route AuthGuard or handler will reject if needed.
          return true;
        }
      }
    }

    if (!user) return true;

    if (user.onboardingComplete === false) {
      throw new ForbiddenException(AuthErrors.ONBOARDING_REQUIRED);
    }

    return true;
  }

  private extractBearer(request: RequestWithUser): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private checkRpc(context: ExecutionContext): boolean {
    const rpcContext = context.switchToRpc().getContext<IUserContext>();
    const user = rpcContext?.userPayload;

    if (!user) return true;

    if ((user as unknown as { onboardingComplete?: boolean }).onboardingComplete === false) {
      throw new RpcException(AuthErrors.ONBOARDING_REQUIRED);
    }

    return true;
  }
}
