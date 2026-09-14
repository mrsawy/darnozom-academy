import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { handleRpcError } from '../errorHandling';

@Injectable()
export class ErrorHandlerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const contextType = context.getType();

    return next.handle().pipe(
      catchError((error: unknown) => {
        if (contextType === 'rpc') {
          // handleRpcError throws an RpcException
          try {
            handleRpcError(error);
          } catch (rpcException: unknown) {
            return throwError(() => rpcException);
          }
        }

        // For other contexts, re-throw
        return throwError(() => error);
      })
    );
  }
}
