import { Actions, ConditionKeys, Subjects, Roles } from '@lms-organization/shared-types';
import { RoleSeedEntry } from './role.types';

const OWN_ORG = { key: ConditionKeys.OWN_ORG, value: 'organizationId' };

/** Organization admin: full control scoped to their own organization. */
export const ORGANIZATION_ADMIN_SEED: RoleSeedEntry = {
  name: Roles.ORGANIZATION_ADMIN,
  permissions: [
    { action: Actions.MANAGE, subject: Subjects.ORGANIZATION, conditions: OWN_ORG },
    { action: Actions.MANAGE, subject: Subjects.USER, conditions: OWN_ORG },
    { action: Actions.MANAGE, subject: Subjects.CLASS, conditions: OWN_ORG },
    { action: Actions.MANAGE, subject: Subjects.ENROLLMENT, conditions: OWN_ORG },
    { action: Actions.MANAGE, subject: Subjects.ATTENDANCE, conditions: OWN_ORG },
    { action: Actions.MANAGE, subject: Subjects.SETTING, conditions: OWN_ORG },
    { action: Actions.MANAGE, subject: Subjects.REPORT, conditions: OWN_ORG },
  ],
};
