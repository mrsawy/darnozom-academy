import { Actions, ConditionKeys, Subjects, Roles } from '@islamic-academy/shared-types';
import { RoleSeedEntry } from './role.types';

const SELF = { key: ConditionKeys.SELF, value: '_id' };
const OWN = { key: ConditionKeys.OWN, value: 'userId' };

/** Student: read-only access to their own records. */
export const STUDENT_SEED: RoleSeedEntry = {
  name: Roles.STUDENT,
  permissions: [
    { action: Actions.READ, subject: Subjects.USER, conditions: SELF },
    { action: Actions.READ, subject: Subjects.CLASS, conditions: OWN },
    { action: Actions.READ, subject: Subjects.ENROLLMENT, conditions: OWN },
    { action: Actions.READ, subject: Subjects.ATTENDANCE, conditions: OWN },
  ],
};
