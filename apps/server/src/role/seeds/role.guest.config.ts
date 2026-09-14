import { Roles } from '@islamic-academy/shared-types';
import { RoleSeedEntry } from './role.types';

/** Guest: no permissions until onboarding assigns a real role. */
export const GUEST_SEED: RoleSeedEntry = {
  name: Roles.GUEST,
  permissions: [],
};
