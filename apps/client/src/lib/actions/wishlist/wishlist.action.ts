'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import {
  IWishlist,
  CreateWishlistDto,
  GetWishlistDto,
} from '@/lib/types/wishlist/wishlist.interface';
import { Paginated } from '@/lib/types/Paginated';
import { isUnauthenticatedError } from '@darnozom/shared-types';

export async function addToWishlist(courseId: string) {
  const payload: CreateWishlistDto = { courseId };
  const result = await createAuthorizedNatsRequest<IWishlist>('wishlist.create', payload);
  if (result && typeof result === 'object' && 'err' in result) {
    const msg = result.err.message;
    if (isUnauthenticatedError(msg)) return null;
    return result; // propagate non-auth errors to throwIfNatsError
  }
  return result;
}

export async function removeFromWishlistByCourse(courseId: string) {
  const result = await createAuthorizedNatsRequest<{ message: string }>('wishlist.removeByCourse', {
    courseId,
  });
  if (result && typeof result === 'object' && 'err' in result) {
    const msg = result.err.message;
    if (isUnauthenticatedError(msg)) return null;
    return result as unknown as void; // propagate non-auth errors
  }
}

export async function getWishlist(options: GetWishlistDto = {}) {
  const result = await createAuthorizedNatsRequest<Paginated<IWishlist>>(
    'wishlist.findAll',
    options
  );
  if (result && typeof result === 'object' && 'err' in result) {
    const msg = result.err.message;
    if (isUnauthenticatedError(msg)) return null;
    return result; // propagate non-auth errors
  }
  return result;
}
