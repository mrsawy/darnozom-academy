import * as Yup from 'yup';
import { InferType } from 'yup';
import { BillingCycle } from '../types/course/enum/BillingCycle.enum';

/** Same contract as `CreateContentForm` / `content.schema` — `(key, values) => t(key, values)` with `CourseForm` namespace. */
export type CourseSchemaTranslateFn = (
  key: string,
  values?: Record<string, string | number>
) => string;
import { Currency, MIN_PAID_PRICE, isBelowMinPaidPrice } from '@lms-organization/shared-types';

function buildPricingDetailsSchema(translate: CourseSchemaTranslateFn) {
  return Yup.object().shape({
    originalPrice: Yup.number()
      .min(0, translate('validation.priceMin'))
      .optional()
      .nullable()
      .test('price-above-minimum', function (value) {
        const { originalCurrency, discountPercentage } = this.parent as {
          originalCurrency?: Currency | null;
          discountPercentage?: number | null;
        };
        if (!isBelowMinPaidPrice(value, originalCurrency, discountPercentage)) return true;
        return this.createError({
          message: translate('validation.priceBelowMinimum', {
            min: MIN_PAID_PRICE[originalCurrency as Currency],
            currency: originalCurrency as string,
          }),
        });
      }),

    originalCurrency: Yup.string()
      .oneOf(Object.values(Currency), translate('validation.currencyInvalid'))
      .nullable()
      .test(
        'currency-requires-price',
        translate('validation.currencyRequiresPrice'),
        function (value) {
          const parent = this.parent as { originalPrice?: number | null };
          const { originalPrice } = parent;
          if (originalPrice == null) {
            return value == null;
          }
          return true;
        }
      ),
    priceUSD: Yup.number().min(0, translate('validation.priceMin')).optional().nullable(),
    priceEGP: Yup.number().min(0, translate('validation.priceMin')).optional().nullable(),

    discountStartDate: Yup.date().optional().nullable(),
    discountEndDate: Yup.date()
      .optional()
      .nullable()
      .test('end-after-start', translate('validation.discountEndAfterStart'), function (endDate) {
        const { discountStartDate } = this.parent as { discountStartDate?: Date | null };
        if (!endDate || !discountStartDate) return true;
        return new Date(endDate) > new Date(discountStartDate);
      }),
    discountPercentage: Yup.number()
      .min(0, translate('validation.discountMin'))
      .max(100, translate('validation.discountMax'))
      .optional()
      .nullable(),
  });
}

function buildPricingSchema(translate: CourseSchemaTranslateFn) {
  const pricingDetailsSchema = buildPricingDetailsSchema(translate);
  return Yup.object().shape({
    [BillingCycle.MONTHLY]: pricingDetailsSchema.optional(),
    [BillingCycle.YEARLY]: pricingDetailsSchema.optional(),
    [BillingCycle.ONE_TIME]: pricingDetailsSchema.optional(),
  });
}

function buildSettingsSchema(translate: CourseSchemaTranslateFn) {
  return Yup.object().shape({
    isPublished: Yup.boolean().optional(),
    isDraft: Yup.boolean().optional(),
    enrollmentLimit: Yup.number()
      .transform((value, originalValue): number | undefined => {
        if (originalValue === '' || originalValue == null || Number.isNaN(originalValue)) {
          return undefined;
        }
        return value;
      })
      .min(1, translate('validation.enrollmentLimitMin'))
      .optional()
      .nullable(),
    enrollmentDeadline: Yup.date().optional().nullable(),
    certificateEnabled: Yup.boolean().optional(),
    discussionEnabled: Yup.boolean().optional(),
    downloadEnabled: Yup.boolean().optional(),
  });
}

export function getCreateCourseSchema(translate: CourseSchemaTranslateFn) {
  const pricingSchema = buildPricingSchema(translate);
  const settingsSchema = buildSettingsSchema(translate);

  return Yup.object().shape({
    instructorId: Yup.string().optional().nullable(),

    coInstructorsIds: Yup.array().of(Yup.string()).optional(),
    name: Yup.string()
      .required(translate('validation.courseNameRequired'))
      .min(3, translate('validation.courseNameMin'))
      .max(100, translate('validation.courseNameMax')),

    description: Yup.string().optional().nullable(),

    shortDescription: Yup.string()
      .max(500, translate('validation.shortDescriptionMax'))
      .optional()
      .nullable(),

    categoriesIds: Yup.array().of(Yup.string().required()).optional(),

    gradeId: Yup.string().optional().nullable(),

    schoolTypeIds: Yup.array().of(Yup.string().required()).optional(),

    instructor: Yup.string().optional().nullable(),

    pricing: Yup.object()
      .optional()
      .test(
        'pricing-required-for-paid',
        translate('validation.pricingRequiredForPaid'),
        function (value) {
          const parent = this.parent as { isPaid?: boolean };
          const { isPaid } = parent;
          if (isPaid) {
            if (!value) return false;
            const { MONTHLY, YEARLY, ONE_TIME } = BillingCycle;
            const pricingValue = value as Record<
              BillingCycle,
              { originalPrice?: number | null; originalCurrency?: string | null } | undefined
            >;
            const hasAtLeastOne = [MONTHLY, YEARLY, ONE_TIME].some((cycle) => {
              return (
                pricingValue[cycle]?.originalPrice != null && pricingValue[cycle]?.originalCurrency
              );
            });
            return hasAtLeastOne;
          }
          return true;
        }
      )
      .shape(pricingSchema.fields),

    isPaid: Yup.boolean().required(translate('validation.isPaidRequired')),

    coInstructors: Yup.array().of(Yup.string().required()).optional(),

    thumbnail: Yup.mixed<File>()
      .test('fileType', translate('validation.thumbnailImageOnly'), (value) => {
        if (!value) return true;
        return ['image/jpeg', 'image/png', 'image/webp'].includes(value.type);
      })
      .nullable()
      .optional(),

    thumbnailKey: Yup.string().optional(),

    trailerKey: Yup.string().optional(),

    trailer: Yup.mixed<File>()
      .test('fileType', translate('validation.trailerVideoOnly'), (value) => {
        if (!value) return true;
        return ['video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime'].includes(value.type);
      })
      .nullable()
      .optional(),

    settings: settingsSchema.optional(),
    learningObjectives: Yup.array().of(Yup.string().required()).optional(),

    attendanceSettings: Yup.object()
      .shape({
        requireAttendance: Yup.boolean().optional(),
        offlineSchedule: Yup.array()
          .of(
            Yup.object().shape({
              startTime: Yup.string()
                .matches(
                  /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(am|pm)$/i,
                  translate('validation.timeFormat')
                )
                .required(translate('validation.startTimeRequired')),
              endTime: Yup.string()
                .matches(
                  /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(am|pm)$/i,
                  translate('validation.timeFormat')
                )
                .required(translate('validation.endTimeRequired')),
              dayOfWeek: Yup.string().required(translate('validation.dayOfWeekRequired')),
              moduleId: Yup.string().optional().nullable(),
              moduleName: Yup.string().optional().nullable(),
              instructorsIds: Yup.array().of(Yup.string()).optional().nullable(),
              coInstructorsIds: Yup.array().of(Yup.string()).optional().nullable(),
              studentsIds: Yup.array().of(Yup.string()).optional().nullable(),
            })
          )
          .optional(),
      })
      .optional(),
  });
}

const defaultTranslate: CourseSchemaTranslateFn = (key) => key;

/** Untranslated fallback (keys only); prefer `getCreateCourseSchema` with `useTranslations`. */
export const createCourseSchema = getCreateCourseSchema(defaultTranslate);

export const getUpdateCourseSchema = (translate: CourseSchemaTranslateFn) =>
  getCreateCourseSchema(translate).partial();

export const updateCourseSchema = getUpdateCourseSchema(defaultTranslate);

export type PricingDetails = InferType<ReturnType<typeof buildPricingDetailsSchema>>;
export type Pricing = InferType<ReturnType<typeof buildPricingSchema>>;
export type Settings = InferType<ReturnType<typeof buildSettingsSchema>>;
export type CreateCourseSchema = InferType<ReturnType<typeof getCreateCourseSchema>>;
export type UpdateCourseSchema = InferType<ReturnType<typeof getUpdateCourseSchema>>;
