import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUserContext } from 'src/utils/types/IUserContext.interface';
import { IUserRequest } from '../interfaces/IUserRequest.interface';

export const CurrentUser = createParamDecorator((_, ctx: ExecutionContext) => {
  if (ctx.getType() === 'rpc') {
    const rpcContext = ctx.switchToRpc().getContext<IUserContext>();
    return rpcContext.userPayload;
  }
  const request = ctx.switchToHttp().getRequest<IUserRequest>();
  return request.user;
});
