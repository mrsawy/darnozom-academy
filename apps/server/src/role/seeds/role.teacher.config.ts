import { Actions, ConditionKeys, Subjects, Roles } from '@lms-organization/shared-types';
import { RoleSeedEntry } from './role.types';

const OWN_ORG = { key: ConditionKeys.OWN_ORG, value: 'organizationId' };

/** Teacher: can read/update their organization's classes, attendance and enrollments. */
export const TEACHER_SEED: RoleSeedEntry = {
  name: Roles.TEACHER,
  permissions: [
    { action: Actions.READ, subject: Subjects.CLASS, conditions: OWN_ORG },
    { action: Actions.UPDATE, subject: Subjects.CLASS, conditions: OWN_ORG },
    { action: Actions.READ, subject: Subjects.ATTENDANCE, conditions: OWN_ORG },
    { action: Actions.UPDATE, subject: Subjects.ATTENDANCE, conditions: OWN_ORG },
    { action: Actions.READ, subject: Subjects.ENROLLMENT, conditions: OWN_ORG },
    { action: Actions.UPDATE, subject: Subjects.ENROLLMENT, conditions: OWN_ORG },
  ],
};
