import { BadRequestException, ConflictException, ForbiddenException, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AxiosError } from 'axios';
import { CommonErrors } from '@lms-organization/shared-types';

const rpcErrorLogger = new Logger('handleRpcError');

interface NestHttpLike {
  getStatus: () => number;
  getResponse: () => string | object;
  message?: string;
  name?: string;
}

function isNestHttpException(error: unknown): error is NestHttpLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as NestHttpLike).getStatus === 'function' &&
    typeof (error as NestHttpLike).getResponse === 'function'
  );
}

/** Nest often puts the real message on getResponse(); Error#message stays generic (e.g. "Bad Request"). */
function messageFromHttpException(exception: NestHttpLike): string {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const msg = (response as { message: unknown }).message;
    if (Array.isArray(msg)) {
      return msg.filter((m): m is string => typeof m === 'string').join(', ');
    }
    if (typeof msg === 'string' && msg.length > 0) {
      return msg;
    }
  }
  return typeof exception.message === 'string' ? exception.message : CommonErrors.INTERNAL_SERVER_ERROR;
}

function logRpcError(error: unknown): void {
  if (isNestHttpException(error)) {
    rpcErrorLogger.warn(
      `RPC error before mapping: ${error.name ?? error.constructor?.name ?? 'HttpException'} status=${error.getStatus()} message=${messageFromHttpException(error)}`
    );
    return;
  }
  if (error instanceof AxiosError) {
    rpcErrorLogger.warn(`RPC error before mapping: AxiosError status=${error.response?.status} data=${JSON.stringify(error.response?.data)}`);
    return;
  }
  if (error instanceof Error) {
    rpcErrorLogger.warn(`RPC error before mapping: ${error.name}: ${error.message}`);
    return;
  }
  rpcErrorLogger.warn(`RPC error before mapping: ${JSON.stringify(error)}`);
}

/** Prefer a shared-types key already on the Axios body; never forward raw provider prose. */
function messageFromAxiosError(error: AxiosError): string {
  const data = error.response?.data;
  if (typeof data === 'string' && data.length > 0 && !/\s/.test(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    const obj = data as { message?: unknown };
    if (typeof obj.message === 'string' && obj.message.length > 0 && !/\s/.test(obj.message)) {
      return obj.message;
    }
  }
  return CommonErrors.INTERNAL_SERVER_ERROR;
}

function toRpcException(error: NestHttpLike): never {
  const status = error.getStatus();
  throw new RpcException({
    message: messageFromHttpException(error),
    code: status,
    error: (error.name ?? 'Error').replace(/Exception$/, '') || 'Error',
  });
}

export const handleError = (error: Error | string) => {
  if (error instanceof NotFoundException) {
    throw error;
  }

  if (error instanceof AxiosError) {
    throw new BadRequestException(messageFromAxiosError(error));
  }

  throw new BadRequestException(error);
};

export const handleRpcError = (error: unknown) => {
  // @ApplyRpcErrorHandling (and similar) already converted HttpExceptions to RpcException.
  // The global ErrorHandlerInterceptor calls handleRpcError again on that RpcException; if we
  // fall through, `(error as Error).message` is often generic ("Bad Request") and wipes the
  // real `getError().message` (e.g. PageErrors.PAGE_SLUG_TAKEN).
  if (error instanceof RpcException) {
    throw error;
  }

  logRpcError(error);

  if (error instanceof AxiosError) {
    throw new RpcException({
      message: messageFromAxiosError(error),
      code: error.response?.status && error.response.status < 500 ? error.response.status : 400,
      error: 'Bad Request',
    });
  }

  // Prefer specific branches, then duck-typed Nest HttpException (instanceof can fail across package copies).
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
  if (error instanceof HttpException || isNestHttpException(error)) {
    toRpcException(error);
  }

  const raw = (error as Error)?.message;
  throw new RpcException({
    message: raw && !/\s/.test(raw) ? raw : CommonErrors.INTERNAL_SERVER_ERROR,
    code: 500,
    error: 'Internal Server Error',
  });
};
