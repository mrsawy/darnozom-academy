import { Roles } from '@darnozom/shared-types';
import { RoleSeedEntry } from './role.types';

/** Permissions arrive with sub-project 4 (content with basic Sharia review). */
export const SHARIA_REVIEWER_SEED: RoleSeedEntry = { name: Roles.SHARIA_REVIEWER, permissions: [] };
