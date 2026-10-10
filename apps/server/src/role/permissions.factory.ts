import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { Actions, ConditionKeys, Subjects, type ICondition } from '@lms-organization/shared-types';
import { Injectable } from '@nestjs/common';
import { Role } from './entities/role.entity';
import { UserDocument } from 'src/user/entities/user.entity';

export type AppAbility = MongoAbility;

// Helper function to safely add permissions
function addPermission(
  can: (action: string, subject: string, conditions?: Record<string, unknown>) => void,
  act: string,
  subj: string,
  conditionQuery?: Record<string, unknown>
): void {
  try {
    if (conditionQuery) {
      can(act, subj, conditionQuery);
    } else {
      can(act, subj);
    }
  } catch {
    // Silently handle permission errors
  }
}

function getConditionKeys(conditions: ICondition | ICondition[] | undefined | null): ConditionKeys[] {
  if (conditions == null) {
    return [];
  }
  if (Array.isArray(conditions)) {
    return conditions
      .filter((c): c is ICondition => c != null && typeof c === 'object' && 'key' in c)
      .map((c) => c.key)
      .filter((k): k is ConditionKeys => k != null);
  }
  if (typeof conditions === 'object' && conditions !== null && 'key' in conditions) {
    const k = conditions.key;
    return k == null ? [] : [k];
  }
  return [];
}

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: UserDocument & { role: Role }): AppAbility {
    const { can, build } = new AbilityBuilder(createMongoAbility);

    // Guard: role may be null when a role document is missing from DB.
    const permissions: Role['permissions'] = user.role?.permissions ?? [];
    for (const permission of permissions) {
      const { action, subject, conditions } = permission;

      const conditionKeys = getConditionKeys(conditions);

      const conditionQuery: Record<string, unknown> = {};
      if (conditionKeys.includes(ConditionKeys.OWN)) {
        conditionQuery[ConditionKeys.OWN] = user._id;
      }
      if (conditionKeys.includes(ConditionKeys.OWN_ORG)) {
        conditionQuery[ConditionKeys.OWN_ORG] = user.organizationId;
      }
      if (conditionKeys.includes(ConditionKeys.SELF)) {
        conditionQuery[ConditionKeys.SELF] = user._id;
      }

      /** Pass `undefined` when there are no field rules — `can(act, sub, {})` breaks CASL mongo internals (`.includes` on undefined). */
      const fieldConditions = Object.keys(conditionQuery).length > 0 ? conditionQuery : undefined;

      // Handle specific action and subject
      if (action !== Actions.MANAGE && subject !== Subjects.ALL) {
        addPermission(can, action, subject, fieldConditions);
        continue;
      }

      // Handle action on ALL subjects
      if (subject === Subjects.ALL && action !== Actions.MANAGE) {
        for (const sub of Object.values(Subjects)) {
          if (sub !== Subjects.ALL) {
            // Skip ALL to avoid recursion
            addPermission(can, action, sub, fieldConditions);
          }
        }
        continue;
      }

      // Handle MANAGE action on specific subject
      if (action === Actions.MANAGE && subject !== Subjects.ALL) {
        for (const act of Object.values(Actions)) {
          if (act !== Actions.MANAGE) {
            // Skip MANAGE to avoid recursion
            addPermission(can, act, subject, fieldConditions);
          }
        }
        continue;
      }

      // Handle MANAGE ALL (super admin)
      if (action === Actions.MANAGE && subject === Subjects.ALL) {
        for (const act of Object.values(Actions)) {
          if (act !== Actions.MANAGE) {
            // Skip MANAGE to avoid recursion
            for (const sub of Object.values(Subjects)) {
              if (sub !== Subjects.ALL) {
                // Skip ALL to avoid recursion
                addPermission(can, act, sub, fieldConditions);
              }
            }
          }
        }
        continue;
      }
    }

    const ability = build({
      detectSubjectType: (item) => {
        // Make sure this returns a string, not undefined
        if (typeof item === 'string') {
          return item;
        }
        if (item?.constructor) {
          return item.constructor.name;
        }
        return 'Unknown';
      },
    });

    return ability;
  }
}
