import * as Yup from 'yup';

export const trainingCourseSchema = Yup.object({
  name: Yup.string().trim().required().max(120),
});

export type TrainingCourseFormValues = Yup.InferType<typeof trainingCourseSchema>;
