'use server';

import { IInstructor } from '@/lib/types/user/user.interface';
import { createNatsRequest } from '@/lib/utils/createNatsRequest';

export const getFeaturedInstructors = async ({ limit = 10 }: { limit?: number } = {}) => {
  const featuredInstructors = await createNatsRequest<IInstructor[]>('instructors.getFeatured', {
    limit,
  });
  return featuredInstructors;
};
