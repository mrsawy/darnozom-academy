import {
  PaginatedUsersByOrganization,
  PaginationOptions,
  withDefaults,
} from '@/lib/types/Paginated';
import { IUser } from '@/lib/types/user/user.interface';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

export const getUsersByOrganization = async (
  options: PaginationOptions,
  filters?: Record<string, unknown>
) => {
  options = withDefaults(options);
  return await createAuthorizedNatsRequest<PaginatedUsersByOrganization<IUser>>(
    'users.getByOrganization',
    { options, filters }
  );
};
