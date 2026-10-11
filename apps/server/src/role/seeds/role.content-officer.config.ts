import { Roles } from '@darnozom/shared-types';
import { RoleSeedEntry } from './role.types';

/** Permissions arrive with sub-project 4 (content with basic Sharia review). */
export const CONTENT_OFFICER_SEED: RoleSeedEntry = { name: Roles.CONTENT_OFFICER, permissions: [] };
