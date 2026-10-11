import * as yup from 'yup';
import { Actions, ConditionKeys, Roles, Subjects } from '@darnozom/shared-types';

export interface RoleFormValues {
  name?: Roles | string;
  permissions: {
    action: Actions;
    subject: Subjects;
    conditions: { key: ConditionKeys; value: string }[];
  }[];
}

export function defaultPermissionRow(): RoleFormValues['permissions'][number] {
  return {
    action: Actions.READ,
    subject: Subjects.USER,
    conditions: [],
  };
}

export function emptyPermissionRow(): RoleFormValues['permissions'][number] {
  return {
    action: '' as Actions,
    subject: '' as Subjects,
    conditions: [],
  };
}

export function buildRoleFormSchema(tVal: (key: string) => string, options: { isCreate: boolean }) {
  const conditionRowSchema = yup.object({
    key: yup.string().oneOf(Object.values(ConditionKeys)).required(tVal('conditionKeyRequired')),
    value: yup.string().required(tVal('conditionValueRequired')),
  });

  const permissionRowSchema = yup.object({
    action: yup.string().oneOf(Object.values(Actions)).required(tVal('actionRequired')),
    subject: yup.string().oneOf(Object.values(Subjects)).required(tVal('subjectRequired')),
    conditions: yup.array().of(conditionRowSchema).default([]),
  });

  return yup.object({
    name: options.isCreate
      ? yup.string().oneOf(Object.values(Roles)).required(tVal('nameRequired'))
      : yup.string().optional(),
    permissions: yup
      .array()
      .of(permissionRowSchema)
      .min(1, tVal('permissionsMin'))
      .required()
      .test('uniquePairs', tVal('duplicatePermission'), (rows) => {
        if (!rows?.length) return true;
        const keys = new Set<string>();
        for (const r of rows) {
          const k = `${r.action}:${r.subject}`;
          if (keys.has(k)) return false;
          keys.add(k);
        }
        return true;
      }),
  });
}
