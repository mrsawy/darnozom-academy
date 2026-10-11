import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Roles } from '@darnozom/shared-types';

interface PlatformAdminUser {
  roleName?: string;
}

interface HttpRequestWithPlatformUser {
  user?: PlatformAdminUser;
}

interface RpcContextWithPlatformUser {
  userPayload?: PlatformAdminUser;
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const contextType = context.getType();

    if (contextType === 'http') {
      const request = context.switchToHttp().getRequest<HttpRequestWithPlatformUser>();
      const user = request.user;
      if (!user || user.roleName !== Roles.PLATFORM_ADMIN) {
        throw new ForbiddenException('Access restricted to platform admin');
      }
      return true;
    }

    if (contextType === 'rpc') {
      const rpcContext = context.switchToRpc().getContext<RpcContextWithPlatformUser>();
      const user = rpcContext.userPayload;
      if (!user || user.roleName !== Roles.PLATFORM_ADMIN) {
        throw new ForbiddenException('Access restricted to platform admin');
      }
      return true;
    }

    throw new ForbiddenException('Unsupported context type');
  }
}
