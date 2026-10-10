/**
 * Utility functions to remove sensitive data from user objects
 */

interface MongooseDocument {
  toObject(): Record<string, unknown>;
}

/**
 * Removes password field from a user object
 * @param user - User object (can be Mongoose document or plain object)
 * @returns User object without password field
 */
export function removePassword<T extends { password?: unknown }>(user: T | null | undefined): Omit<T, 'password'> | null | undefined {
  if (!user) return user as Omit<T, 'password'> | null | undefined;

  const userObj = user as T & Partial<MongooseDocument>;
  if (typeof userObj.toObject === 'function') {
    // Mongoose document
    const { password: _password, ...userData } = userObj.toObject();
    return userData as Omit<T, 'password'>;
  }

  // Plain object
  const { password: _password, ...userData } = user;
  return userData;
}

/**
 * Removes multiple sensitive fields from a user object
 * @param user - User object (can be Mongoose document or plain object)
 * @param fieldsToRemove - Array of field names to remove (default: ['password'])
 * @returns User object without specified sensitive fields
 */
export function remove<T extends Record<string, unknown>>(
  user: T | null | undefined,
  fieldsToRemove: string[] = ['password']
): Partial<T> | null | undefined {
  if (!user) return user as Partial<T> | null | undefined;

  const userObj = user as T & Partial<MongooseDocument>;
  const userData: Record<string, unknown> = typeof userObj.toObject === 'function' ? userObj.toObject() : { ...user };

  // Remove specified fields
  for (const field of fieldsToRemove) {
    delete userData[field];
  }

  return userData as Partial<T>;
}
