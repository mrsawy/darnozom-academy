'use server';

import { Paginated, PaginationOptions, withDefaults } from '@/lib/types/Paginated';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';
import { IEnrollment } from '@/lib/types/enrollment/enrollment.interface';

export async function getUserEnrollments(options: PaginationOptions = {}) {
  return await createAuthorizedNatsRequest<Paginated<IEnrollment>>(
    'enrollment.getUserEnrollments',
    {
      options: withDefaults(options),
    }
  );
}
