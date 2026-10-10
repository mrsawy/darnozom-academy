import * as yup from 'yup';
import type { AiAttachmentMime } from '@lms-organization/shared-types';

// File-level validation (count/size/MIME) lives in `AiAttachmentPicker`, which
// owns the picker UI and reports validity to the parent. The schema only
// guarantees that the form field is shaped as `File[]`.
export const aiAttachmentsSchema = yup.array().of(yup.mixed<File>().required()).default([]);

export type AiAttachmentMimeClient = AiAttachmentMime;
