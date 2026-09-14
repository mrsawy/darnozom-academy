import { BadRequestException, ConflictException, ForbiddenException, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

const rpcErrorLogger = new Logger('handleRpcError');

/** Nest often puts the real message on getResponse(); Error#message stays generic (e.g. "Bad Request"). */
function messageFromHttpException(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const msg = (response as { message: unknown }).message;
    if (Array.isArray(msg)) {
      return msg.filter((m): m is string => typeof m === 'string').join(', ');
    }
    if (typeof msg === 'string') {
      return msg;
    }
  }
  return exception.message;
}

export const handleError = (error: Error | string) => {
  if (error instanceof NotFoundException) {
    throw error;
  }
  throw new BadRequestException(error);
};

export const handleRpcError = (error: unknown) => {
  // @ApplyRpcErrorHandling (and similar) already converted HttpExceptions to RpcException.
  // The global ErrorHandlerInterceptor calls handleRpcError again on that RpcException; if we
  // fall through, `(error as Error).message` is often generic and wipes the real message.
  if (error instanceof RpcException) {
    throw error;
  }

  rpcErrorLogger.warn(`RPC error before mapping: ${JSON.stringify(error)}`);

  if (error instanceof ForbiddenException) {
    throw new RpcException({
      message: messageFromHttpException(error),
      code: 403,
      error: 'Forbidden',
    });
  }
  if (error instanceof ConflictException) {
    throw new RpcException({
      message: messageFromHttpException(error),
      code: 409,
      error: 'Conflict',
    });
  }
  if (error instanceof NotFoundException) {
    throw new RpcException({
      message: messageFromHttpException(error),
      code: 404,
      error: 'Not Found',
    });
  }

  if (error instanceof BadRequestException) {
    throw new RpcException({
      message: messageFromHttpException(error),
      code: 400,
      error: 'Bad Request',
    });
  }

  const message = (error as Error)?.message || 'Process Failed. Please try again later.';
  throw new RpcException({
    message,
    code: 500,
    error: 'Internal Server Error',
  });
};
