'use server';

import type { Roles } from '@darnozom/shared-types';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

export async function setAdditionalRoles(userId: string, additionalRoles: Roles[]) {
  return createAuthorizedNatsRequest<{ additionalRoles: Roles[] }>('users.setAdditionalRoles', {
    userId,
    additionalRoles,
  });
}
