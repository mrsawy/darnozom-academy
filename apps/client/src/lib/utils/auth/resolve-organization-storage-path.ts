import type { IUser } from '@/lib/types/user/user.interface';

function coerceStorageSegment(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  if (
    value &&
    typeof value === 'object' &&
    'toHexString' in value &&
    typeof (value as { toHexString: () => string }).toHexString === 'function'
  ) {
    return (value as { toHexString: () => string }).toHexString();
  }
  return '';
}

/**
 * S3 / upload path segment for an organization: prefer slug, then populated
 * organization._id, then the user's organizationId. Coerces non-string ids
 * so intermittent ObjectId/string shapes from cache vs server don't fail uploads.
 */
export function resolveOrganizationStoragePath(user: IUser | null | undefined): string {
  if (!user) return '';

  const slug = user.organization?.slug;
  if (typeof slug === 'string' && slug.trim().length > 0) {
    return slug.trim();
  }

  const fromOrg = coerceStorageSegment(user.organization?._id);
  if (fromOrg) return fromOrg;

  return coerceStorageSegment(user.organizationId);
}
