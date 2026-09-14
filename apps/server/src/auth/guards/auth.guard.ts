import { CanActivate, ExecutionContext, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../user/entities/user.entity';
import { Role } from '../../role/entities/role.entity';
import { AppAbility, CaslAbilityFactory } from '../../role/permissions.factory';
import { IUserContext } from '../../utils/types/IUserContext.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly caslAbilityFactory: CaslAbilityFactory
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'http') {
      return await this.handleHttpRequest(context);
    } else if (context.getType() === 'rpc') {
      return await this.handleRpcRequest(context);
    } else {
      throw new InternalServerErrorException('unimplemented communication context');
    }
  }

  private async handleHttpRequest(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: unknown }>();
    if (request.user) {
      return true;
    }
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = (await this.authService.verifyToken(token)) as UserDocument & { role: Role };
      const ability = this.caslAbilityFactory.createForUser(payload).rules;

      request.user = { ...payload, ability };
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException('Invalid token ::=>', errorMessage);
    }
  }

  private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async handleRpcRequest(context: ExecutionContext): Promise<boolean> {
    const data: { authorization: string } = context.switchToRpc().getData();
    const rpcContext = context.switchToRpc().getContext<IUserContext>();
    if (rpcContext.userPayload && rpcContext.userAbility) {
      return true;
    }
    try {
      if (!data.authorization || data.authorization.trim() === '') {
        throw new RpcException('please provide token');
      }
      const user = (await this.authService.verifyToken(data.authorization)) as UserDocument & { role: Role } & { ability: AppAbility };
      const ability = this.caslAbilityFactory.createForUser(user).rules;
      const userPayload = user;
      userPayload.ability = ability as unknown as AppAbility;
      rpcContext.userPayload = userPayload;
      rpcContext.userAbility = ability as unknown as AppAbility;
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error && error.message ? error.message : 'session expired! Please sign In';

      throw new RpcException('auth-failed-' + errorMessage);
    }
  }
}
