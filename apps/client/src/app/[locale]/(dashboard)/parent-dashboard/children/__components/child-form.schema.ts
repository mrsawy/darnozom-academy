import * as Yup from 'yup';
import { InferType } from 'yup';
import { Country } from '@darnozom/shared-types';

export const createChildSchema = Yup.object().shape({
  username: Yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .test('starts-with-letter', 'Username must start with a letter', (value) =>
      /^[a-zA-Z]/.test(value || '')
    ),
  email: Yup.string().email('Invalid email format').required('Email is required'),
  phone: Yup.string()
    .required('Phone number is required')
    .matches(/^\+?[0-9]\d{1,14}$/, 'Please enter a valid phone number'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  firstName: Yup.string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: Yup.string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  country: Yup.string()
    .oneOf(Object.values(Country), 'Please select a valid country')
    .required('Country is required'),
});

export const updateChildSchema = Yup.object().shape({
  firstName: Yup.string().optional().min(2, 'First name must be at least 2 characters'),
  lastName: Yup.string().optional().min(2, 'Last name must be at least 2 characters'),
  phone: Yup.string()
    .optional()
    .matches(/^\+?[0-9]\d{1,14}$/, 'Please enter a valid phone number'),
  country: Yup.string()
    .optional()
    .oneOf([...Object.values(Country), ''], 'Please select a valid country'),
});

export type CreateChildSchema = InferType<typeof createChildSchema>;
export type UpdateChildSchema = InferType<typeof updateChildSchema>;
