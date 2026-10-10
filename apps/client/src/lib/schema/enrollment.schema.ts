import * as yup from 'yup';

export const createEnrollmentSchema = yup.object({
  course: yup.string().required('Course is required'),
  user: yup.string().required('User is required'),
  startsAt: yup.date().nullable().optional(),
  endsAt: yup
    .date()
    .nullable()
    .optional()
    .when('startsAt', ([startsAt], schema) =>
      startsAt ? schema.min(startsAt, 'End date must be after start date') : schema
    ),
});

export type CreateEnrollmentSchema = yup.InferType<typeof createEnrollmentSchema>;
