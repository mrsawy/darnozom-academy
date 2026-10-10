import { Actions, ConditionKeys, Subjects } from '@lms-organization/shared-types';
import { AppAbility } from 'src/role/permissions.factory';

export function checkConditionForRule(ability: AppAbility, action: Actions, subject: Subjects, conditionKey: ConditionKeys) {
  const rules = ability.rules;
  let hasCondition = false;
  const matchedRules = rules.filter((rule) => rule.subject === subject && rule.action === action && rule.conditions && rule.conditions[conditionKey]);
  if (matchedRules.length > 0) {
    hasCondition = true;
  }
  return {
    hasCondition,
    conditionValue: matchedRules.length > 0 && matchedRules[0].conditions ? matchedRules[0].conditions[conditionKey] : undefined,
  };
}
