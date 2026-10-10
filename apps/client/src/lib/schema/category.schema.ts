import * as yup from 'yup';

export const baseCategorySchema = yup.object({
  name: yup
    .string()
    .required('Category name is required')
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters')
    .trim(),
  description: yup.string().optional().max(500, 'Description cannot exceed 500 characters').trim(),
  parentId: yup.string().nullable().optional(),
});

export type CategoryFormData = yup.InferType<typeof baseCategorySchema>;
