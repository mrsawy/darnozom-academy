import * as yup from 'yup';
import { BillingCycle } from '@darnozom/shared-types';

const priceDetailsSchema = yup.object({
  originalPrice: yup.number().min(0, 'Must be ≥ 0').required('Required'),
  originalCurrency: yup.string().required('Required'),
  priceUSD: yup.number().min(0, 'Must be ≥ 0').required('Required'),
});

export const aiPlanFormSchema = yup.object({
  name: yup.string().required('Plan name is required'),
  description: yup.string().required('Description is required'),
  tier: yup.string().oneOf(['FREE', 'PRO']).required('Tier is required'),
  isActive: yup.boolean().required(),
  features: yup
    .object({
      messagesPerDay: yup.number().min(-1, 'Use -1 for unlimited').required('Required'),
      aiAssistant: yup.boolean().default(true),
    })
    .required(),
  price: yup
    .object({
      [BillingCycle.MONTHLY]: priceDetailsSchema.required(),
      [BillingCycle.YEARLY]: priceDetailsSchema.required(),
      [BillingCycle.ONE_TIME]: priceDetailsSchema.required(),
    })
    .required(),
});

export type AiPlanFormValues = yup.InferType<typeof aiPlanFormSchema>;

const defaultPriceDetails = { originalPrice: 0, originalCurrency: 'USD', priceUSD: 0 };

export const defaultAiPlanFormValues: AiPlanFormValues = {
  name: '',
  description: '',
  tier: 'FREE',
  isActive: true,
  features: {
    messagesPerDay: 20,
    aiAssistant: true,
  },
  price: {
    [BillingCycle.MONTHLY]: { ...defaultPriceDetails },
    [BillingCycle.YEARLY]: { ...defaultPriceDetails },
    [BillingCycle.ONE_TIME]: { ...defaultPriceDetails },
  },
};
