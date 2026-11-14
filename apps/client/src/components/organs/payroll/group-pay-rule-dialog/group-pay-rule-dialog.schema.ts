import * as yup from 'yup';
import { Currency, GroupPayModel } from '@darnozom/shared-types';

export const groupPayRuleSchema = yup.object({
  groupId: yup.string().required(),
  model: yup.mixed<GroupPayModel>().oneOf(Object.values(GroupPayModel)).required(),
  rate: yup
    .number()
    .typeError('rate')
    .min(0)
    .required()
    // A percentage cannot pass 100; every other model's rate is a money amount.
    .when('model', ([model], schema) =>
      model === GroupPayModel.PERCENT_OF_SUBSCRIPTIONS ? schema.max(100) : schema
    ),
  currency: yup.mixed<Currency>().oneOf(Object.values(Currency)).required(),
  effectiveFrom: yup.string().required(),
});

export type GroupPayRuleForm = yup.InferType<typeof groupPayRuleSchema>;
