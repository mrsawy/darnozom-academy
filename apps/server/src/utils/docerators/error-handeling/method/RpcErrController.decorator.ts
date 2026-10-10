import { handleRpcError } from 'src/utils/errorHandling';

/**
 * Method decorator that wraps RPC controller methods with error handling.
 * Preserves all NestJS metadata (MessagePattern, UseGuards, etc.)
 *
 * Usage:
 * ```typescript
 * @UseGuards(AuthGuard)
 * @MessagePattern('reviews.create')
 * @RpcErrorHandler
 * async create(@Payload() dto, @Ctx() context) {
 *     return await this.service.create(dto);
 * }
 * ```
 */
export function RpcErrorHandler(target: object, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

  // Create a new function that wraps the original
  const wrappedMethod = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
    try {
      const result = await originalMethod.apply(this, args);
      return result as unknown;
    } catch (error: unknown) {
      handleRpcError(error);
    }
  };

  // CRITICAL: Copy all metadata from original method to wrapped method
  // This preserves @MessagePattern, @UseGuards, etc.
  const metadataKeys = Reflect.getMetadataKeys(originalMethod);
  for (const key of metadataKeys) {
    const metadata = Reflect.getMetadata(key, originalMethod) as unknown;
    Reflect.defineMetadata(key, metadata, wrappedMethod);
  }

  descriptor.value = wrappedMethod as PropertyDescriptor['value'];
  return descriptor;
}
