import { Injectable, CanActivate, ExecutionContext, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { CaslAbilityFactory, AppAbility } from '../permissions.factory';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserDocument } from 'src/user/entities/user.entity';
import { Role } from '../entities/role.entity';

interface RequiredPermission {
  action: string;
  subject: string;
  conditions?: unknown;
}

interface RpcContextWithUser {
  userPayload?: UserDocument & { role: Role };
  userAbility?: AppAbility;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory
  ) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const requiredPermissions = this.reflector.get<RequiredPermission[]>(PERMISSIONS_KEY, context.getHandler());

      if (!requiredPermissions) {
        return true;
      }

      if (context.getType() === 'http') {
        return this.handleHttpContext(context, requiredPermissions);
      }
      if (context.getType() === 'rpc') {
        return this.handleRpcContext(context, requiredPermissions);
      }

      throw new InternalServerErrorException('Unimplemented communication context');
    } catch (error: unknown) {
      if (error instanceof ForbiddenException || error instanceof RpcException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while checking permissions';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  private handleHttpContext(context: ExecutionContext, requiredPermissions: RequiredPermission[]): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: UserDocument & { role: Role };
      userAbility?: AppAbility;
    }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const ability = this.caslAbilityFactory.createForUser(user);

    for (const permission of requiredPermissions) {
      if (!ability.can(permission.action, permission.subject)) {
        throw new ForbiddenException(`Insufficient permissions. Required: ${permission.action} ${permission.subject}`);
      }
    }

    request.userAbility = ability;
    return true;
  }

  private handleRpcContext(context: ExecutionContext, requiredPermissions: RequiredPermission[]): boolean {
    const rpcContext = context.switchToRpc().getContext<RpcContextWithUser>();
    const user = rpcContext.userPayload;

    if (!user) {
      throw new RpcException('User not authenticated');
    }

    const ability = this.caslAbilityFactory.createForUser(user);

    for (const permission of requiredPermissions) {
      if (!ability.can(permission.action, permission.subject)) {
        throw new RpcException(`Insufficient permissions. Required: ${permission.action} ${permission.subject}`);
      }
    }

    rpcContext.userAbility = ability;
    return true;
  }

  // Helper method for checking specific resource instances
  // Use this when you have the actual resource object
  canAccessResource(ability: AppAbility, action: string, subject: string, resource: unknown): boolean {
    try {
      // CASL's can method: can(action, subject, field?)
      // For resource instances, pass the resource as the subject
      // The detectSubjectType function will determine the subject type from the resource
      return ability.can(action, resource as string | object);
    } catch {
      return false;
    }
  }
}
