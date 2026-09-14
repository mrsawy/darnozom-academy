import { Actions, ConditionKeys, Subjects, Roles } from '@islamic-academy/shared-types';
import { RoleSeedEntry } from './role.types';

const OWN = { key: ConditionKeys.OWN, value: 'parentId' };

/** Parent: read-only access to their linked children's records. */
export const PARENT_SEED: RoleSeedEntry = {
  name: Roles.PARENT,
  permissions: [
    { action: Actions.READ, subject: Subjects.USER, conditions: OWN },
    { action: Actions.READ, subject: Subjects.ENROLLMENT, conditions: OWN },
    { action: Actions.READ, subject: Subjects.ATTENDANCE, conditions: OWN },
  ],
};
