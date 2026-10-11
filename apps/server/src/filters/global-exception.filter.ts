import { Catch, ArgumentsHost, HttpException, HttpStatus, ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';
import { throwError } from 'rxjs';
import { CommonErrors } from '@darnozom/shared-types';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType();

    if (contextType === 'http') {
      return this.handleHttpException(exception, host);
    } else if (contextType === 'rpc') {
      return this.handleRpcException(exception, host);
    }
  }

  private handleHttpException(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = CommonErrors.INTERNAL_SERVER_ERROR;
    let error = 'Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (typeof responseObj.message === 'string' ? responseObj.message : message) ?? message;
        error = (typeof responseObj.error === 'string' ? responseObj.error : error) ?? error;
      }
    } else if (exception instanceof RpcException) {
      const rpcError = exception.getError();
      if (typeof rpcError === 'string') {
        message = rpcError;
      } else if (rpcError && typeof rpcError === 'object') {
        const rpcErrorObj = rpcError as Record<string, unknown>;
        message = (typeof rpcErrorObj.message === 'string' ? rpcErrorObj.message : JSON.stringify(rpcError)) ?? JSON.stringify(rpcError);
      } else {
        message = String(rpcError);
      }
      status = HttpStatus.BAD_GATEWAY;
    } else {
      message = CommonErrors.INTERNAL_SERVER_ERROR;
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url ?? '/',
      error,
      message,
    });
  }

  private handleRpcException(exception: unknown, _host: ArgumentsHost) {
    let error: { statusCode: number; message: string; error: string; code?: number } = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: CommonErrors.INTERNAL_SERVER_ERROR,
      error: 'RpcError',
    };

    if (exception instanceof RpcException) {
      const rpcError = exception.getError();
      if (typeof rpcError === 'object' && rpcError !== null) {
        error = rpcError as { statusCode: number; message: string; error: string; code?: number };
      } else if (typeof rpcError === 'string') {
        error.message = rpcError;
      }
    } else if (exception instanceof HttpException) {
      const httpResponse = exception.getResponse();
      if (typeof httpResponse === 'string') {
        error = { statusCode: exception.getStatus(), message: httpResponse, error: 'HttpException' };
      } else if (typeof httpResponse === 'object' && httpResponse !== null) {
        error = httpResponse as { statusCode: number; message: string; error: string; code?: number };
      }
    } else if (exception instanceof Error) {
      error.message = CommonErrors.INTERNAL_SERVER_ERROR;
    }

    if (exception instanceof RpcException && typeof exception.getError() === 'object') {
      const errObj = exception.getError() as Record<string, unknown>;
      if (typeof errObj.statusCode === 'number' || typeof errObj.code === 'number') {
        error = errObj as { statusCode: number; message: string; error: string; code?: number };
      }
    }

    return throwError(() => error);
  }
}
