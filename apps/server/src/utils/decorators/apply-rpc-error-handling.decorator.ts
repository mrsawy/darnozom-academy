import { handleRpcError } from '../errorHandling';

/**
 * Class decorator that wraps all methods with RPC error handling.
 * Preserves NestJS metadata for decorators like @MessagePattern, @UseGuards, etc.
 *
 * Usage:
 * ```typescript
 * @ApplyRpcErrorHandling
 * @Controller()
 * export class SomeControllerMessage {
 *     @MessagePattern('some.create')
 *     async create() { ... }
 * }
 * ```
 */
function createWrappedMethod(originalMethod: (...args: unknown[]) => unknown): (...args: unknown[]) => Promise<unknown> {
  return async function (this: unknown, ...args: unknown[]): Promise<unknown> {
    try {
      return await originalMethod.apply(this, args);
    } catch (error: unknown) {
      handleRpcError(error);
    }
  };
}

// `any[]` is required for class decorators: DI constructors have typed params, and
// `unknown[]` is not assignable under construct-signature variance (TS1238/TS1270).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ApplyRpcErrorHandling<T extends abstract new (...args: any[]) => object>(constructor: T): T {
  const methodNames = Object.getOwnPropertyNames(constructor.prototype);

  for (const methodName of methodNames) {
    if (methodName === 'constructor') continue;

    const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, methodName);
    if (!descriptor || typeof descriptor.value !== 'function') continue;

    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    const wrappedMethod = createWrappedMethod(originalMethod);

    const metadataKeys = Reflect.getMetadataKeys(originalMethod);
    for (const key of metadataKeys) {
      const metadata = Reflect.getMetadata(key, originalMethod) as unknown;
      Reflect.defineMetadata(key, metadata, wrappedMethod);
    }

    Object.defineProperty(wrappedMethod, 'name', { value: originalMethod.name });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    descriptor.value = wrappedMethod as PropertyDescriptor['value'];
    Object.defineProperty(constructor.prototype, methodName, descriptor);
  }

  return constructor;
}
