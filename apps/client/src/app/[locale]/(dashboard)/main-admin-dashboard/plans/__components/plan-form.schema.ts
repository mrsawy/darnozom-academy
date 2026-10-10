import * as yup from 'yup';

const priceDetailsSchema = yup.object({
  originalPrice: yup.number().min(0, 'Must be ≥ 0').required('Required'),
  originalCurrency: yup.string().required('Required'),
  priceUSD: yup.number().min(0, 'Must be ≥ 0').required('Required'),
});

const boolFeature = () => yup.boolean().default(false);

const featuresSchema = yup.object({
  usersPerSubscription: yup.number().min(-1).required('Required'),
  coursesPerSubscription: yup.number().min(-1).required('Required'),
  parentAccountsPerSubscription: yup.number().min(-1).required('Required'),
  pagesPerSubscription: yup.number().min(-1).required('Required'),
  liveSessionsPerMonth: yup.number().min(-1).required('Required'),
  assignmentsPerMonth: yup.number().min(-1).required('Required'),
  maxStorageGB: yup.number().min(0).required('Required'),
  courseAnalytics: boolFeature(),
  contentAnalytics: boolFeature(),
  moduleAnalytics: boolFeature(),
  trackingStudentProgress: boolFeature(),
  prioritySupport: boolFeature(),
  accessStudentsInfo: boolFeature(),
  certificates: boolFeature(),
  discussions: boolFeature(),
  customBranding: boolFeature(),
  inAppChat: boolFeature(),
  liveSessions: boolFeature(),
  quizzes: boolFeature(),
  assignments: boolFeature(),
  bulkExport: boolFeature(),
  apiAccess: boolFeature(),
  whiteLabel: boolFeature(),
  customDomain: boolFeature(),
  sso: boolFeature(),
  attendanceTracking: boolFeature(),
  dripContent: boolFeature(),
  gamification: boolFeature(),
  webhooks: boolFeature(),
  reporting: boolFeature(),
  courseTemplates: boolFeature(),
  multiLanguage: boolFeature(),
});

export const planFormSchema = yup.object({
  name: yup.string().required('Plan name is required'),
  description: yup.string().required('Description is required'),
  tier: yup.string().required('Tier is required'),
  isActive: yup.boolean().required(),
  price: yup
    .object({
      MONTHLY: priceDetailsSchema.required(),
      YEARLY: priceDetailsSchema.required(),
      ONE_TIME: priceDetailsSchema.required(),
    })
    .required(),
  features: featuresSchema.required(),
});

export type PlanFormValues = yup.InferType<typeof planFormSchema>;

export const defaultPlanFeatures: PlanFormValues['features'] = {
  usersPerSubscription: -1,
  coursesPerSubscription: -1,
  parentAccountsPerSubscription: -1,
  pagesPerSubscription: -1,
  liveSessionsPerMonth: -1,
  assignmentsPerMonth: -1,
  maxStorageGB: 10,
  courseAnalytics: false,
  contentAnalytics: false,
  moduleAnalytics: false,
  trackingStudentProgress: false,
  prioritySupport: false,
  accessStudentsInfo: false,
  certificates: false,
  discussions: false,
  customBranding: false,
  inAppChat: false,
  liveSessions: false,
  quizzes: false,
  assignments: false,
  bulkExport: false,
  apiAccess: false,
  whiteLabel: false,
  customDomain: false,
  sso: false,
  attendanceTracking: false,
  dripContent: false,
  gamification: false,
  webhooks: false,
  reporting: false,
  courseTemplates: false,
  multiLanguage: false,
};

const defaultPriceDetails = { originalPrice: 0, originalCurrency: 'USD', priceUSD: 0 };

export const defaultPlanFormValues: PlanFormValues = {
  name: '',
  description: '',
  tier: '',
  isActive: true,
  price: {
    MONTHLY: { ...defaultPriceDetails },
    YEARLY: { ...defaultPriceDetails },
    ONE_TIME: { ...defaultPriceDetails },
  },
  features: defaultPlanFeatures,
};
