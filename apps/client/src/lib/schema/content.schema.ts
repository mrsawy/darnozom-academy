import * as yup from 'yup';
import { Platform } from '@darnozom/shared-types';
import { CourseContentType } from '../types/course/enum/CourseContentType.enum';
import { VideoType } from '../types/course/enum/VideoType.enum';

export type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function buildBaseSchema(translate: TranslateFn) {
  return yup.object({
    _id: yup.string().optional(),
    type: yup
      .string()
      .oneOf(Object.values(CourseContentType), translate('validation.typeInvalid'))
      .required(translate('validation.typeRequired')),
    title: yup
      .string()
      .required(translate('validation.titleRequired'))
      .min(3, translate('validation.titleMin'))
      .max(200, translate('validation.titleMax'))
      .trim(),
    description: yup.string().max(1000, translate('validation.descriptionMax')).trim().optional(),
  });
}

function buildArticleContentSchema(translate: TranslateFn) {
  return yup.object({
    body: yup
      .string()
      .required(translate('validation.articleBodyRequired'))
      .min(10, translate('validation.articleBodyMin'))
      .max(50_000, translate('validation.articleBodyMax')),
  });
}

function buildVideoContentSchema(translate: TranslateFn) {
  return yup.object({
    videoType: yup
      .string()
      .oneOf(Object.values(VideoType), translate('validation.videoTypeInvalid'))
      .required(translate('validation.videoTypeRequired')),
    videoUrl: yup
      .string()
      .optional()
      .test('video-url-required', translate('validation.videoUrlRequired'), function (value) {
        const parent = this.parent as { videoType?: string };
        const { videoType } = parent;
        if (videoType === VideoType.URL) {
          if (!value || value.trim() === '') return false;
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        }
        return true;
      }),
    fileKey: yup
      .string()
      .optional()
      .test('file-key-required', translate('validation.fileKeyRequired'), function (value) {
        const parent = this.parent as { videoType?: string };
        const { videoType } = parent;
        if (videoType === VideoType.UPLOAD) {
          return value != null && value.trim() !== '';
        }
        return true;
      }),
    fileSizeBytes: yup
      .number()
      .optional()
      .min(1, translate('validation.fileSizeMin'))
      .test('file-size-required', translate('validation.fileSizeRequired'), function (value) {
        const parent = this.parent as { videoType?: string };
        const { videoType } = parent;
        if (videoType === VideoType.UPLOAD) {
          return value != null && typeof value === 'number' && value >= 1;
        }
        return true;
      }),
    videoFile: yup
      .mixed()
      .optional()
      .test('video-file-required', translate('validation.videoFileRequired'), function (value) {
        const parent = this.parent as { videoType?: string };
        const { videoType } = parent;
        if (videoType === VideoType.UPLOAD) {
          if (!value) return false;
          if (!(value instanceof File)) return false;
          const maxBytes = 1500 * 1024 * 1024;
          if (value.size > maxBytes) {
            return this.createError({
              message: translate('validation.videoFileSizeMax', {
                max: 1500,
                current: Math.round(value.size / (1024 * 1024)),
              }),
            });
          }
        }
        return true;
      }),
  });
}

function buildQuestionSchema(translate: TranslateFn) {
  return yup.object({
    questionText: yup
      .string()
      .required(translate('validation.questionTextRequired'))
      .min(5, translate('validation.questionTextMin'))
      .max(500, translate('validation.questionTextMax'))
      .trim(),
    options: yup
      .array()
      .of(
        yup
          .string()
          .required(translate('validation.optionRequired'))
          .min(1, translate('validation.optionMin'))
          .max(200, translate('validation.optionMax'))
          .trim()
      )
      .min(2, translate('validation.optionsMin'))
      .max(6, translate('validation.optionsMax'))
      .required(translate('validation.optionsRequired')),
    correctOption: yup
      .number()
      .integer(translate('validation.correctOptionInteger'))
      .min(0, translate('validation.correctOptionMin'))
      .required(translate('validation.correctOptionRequired'))
      .test('valid-option-index', translate('validation.correctOptionIndex'), function (value) {
        const parent = this.parent as { options?: string[] };
        const { options } = parent;
        if (!options) return false;
        return value < options.length;
      })
      .test('valid-option-selected', translate('validation.correctAnswerSelect'), function (value) {
        const parent = this.parent as { options?: string[] };
        const { options } = parent;
        if (!options) return false;
        return value >= 0 && value < options.length && options[value]?.trim() !== '';
      }),
  });
}

function buildQuizContentSchema(translate: TranslateFn) {
  const questionSchema = buildQuestionSchema(translate);
  return yup.object({
    questions: yup
      .array()
      .of(questionSchema)
      .min(1, translate('validation.quizQuestionsMin'))
      .max(50, translate('validation.quizQuestionsMax'))
      .required(translate('validation.questionsRequired'))
      .test('valid-questions', translate('validation.questionsValid'), function (questions) {
        if (!questions || questions.length === 0) return false;
        return questions.every(
          (question) =>
            question.questionText?.trim() !== '' &&
            question.options?.length >= 2 &&
            question.options.every((option) => option?.trim() !== '') &&
            question.correctOption >= 0 &&
            question.correctOption < question.options.length
        );
      }),
    quizStartDate: yup.date().required().default(new Date()),
    quizEndDate: yup
      .date()
      .required()
      .min(yup.ref('quizStartDate'), translate('validation.quizEndAfterStart')),
    quizDurationInMinutes: yup
      .number()
      .required()
      .min(1, translate('validation.durationMin'))
      .max(480, translate('validation.durationMax'))
      .integer(translate('validation.durationInteger')),
    maxAttempts: yup
      .number()
      .transform((value, originalValue): number | undefined => {
        if (originalValue === '' || originalValue == null) {
          return undefined;
        }
        return value;
      })
      .min(1)
      .integer()
      .default(1)
      .optional(),
  });
}

function buildAssignmentContentSchema(translate: TranslateFn) {
  return yup.object({
    dueDate: yup
      .date()
      .required(translate('validation.dueDateRequired'))
      .min(new Date(), translate('validation.dueDateFuture')),
    maxPoints: yup
      .mixed()
      .transform((originalValue: unknown): number | string | undefined => {
        if (originalValue === '' || originalValue == null) return;
        const n = Number(originalValue);
        return Number.isNaN(n) ? (originalValue as number | string) : n;
      })
      .test(
        'maxPoints-type',
        translate('validation.maxPointsMustBeNumber'),
        (value) =>
          value === undefined ||
          (['number', 'string'].includes(typeof value) && !Number.isNaN(value))
      )
      .test('maxPoints-range', translate('validation.maxPointsMinMax'), (v) => {
        const value = Number(v);
        if (value === undefined) return true;
        return typeof value === 'number' && value >= 1 && value <= 1000 && Number.isInteger(value);
      })
      .default(100)
      .optional(),
    instructions: yup
      .string()
      .optional()
      .max(5000, translate('validation.assignmentInstructionsMax')),
    fileKey: yup.string().optional(),
    fileSizeBytes: yup
      .number()
      .optional()
      .min(1, translate('validation.fileSizeMin'))
      .test(
        'file-size-required-with-file',
        translate('validation.fileSizeRequiredWithFile'),
        function (value) {
          const parent = this.parent as { fileKey?: string };
          if (parent.fileKey && parent.fileKey.trim() !== '') {
            return value != null && typeof value === 'number' && value >= 1;
          }
          return true;
        }
      ),
    content: yup.string().optional().max(5000, translate('validation.assignmentContentMax')),
  });
}

function buildLiveSessionContentSchema(translate: TranslateFn) {
  return yup.object({
    startDate: yup.date().required(translate('validation.liveSessionStartDateRequired')),
    endDate: yup
      .date()
      .required(translate('validation.liveSessionEndDateRequired'))
      .min(yup.ref('startDate'), translate('validation.liveSessionEndDateAfterStart')),
    provider: yup.string().oneOf(['EXTERNAL_URL', 'AGORA']).optional().default('EXTERNAL_URL'),
    meetingUrl: yup
      .string()
      .optional()
      .when('provider', {
        is: (v: string | undefined) => !v || v === 'EXTERNAL_URL',
        // eslint-disable-next-line unicorn/no-thenable -- Yup conditional schema API
        then: (s) =>
          s
            .required(translate('validation.liveSessionMeetingUrlRequired'))
            .url(translate('validation.liveSessionMeetingUrlInvalid')),
        otherwise: (s) => s.optional(),
      }),
    meetingId: yup.string().optional(),
    meetingPassword: yup.string().optional(),
    platform: yup
      .string()
      .oneOf(
        Object.values(Platform) as string[],
        translate('validation.liveSessionPlatformInvalid')
      )
      .optional(),
    recordingUrl: yup
      .string()
      .optional()
      .url(translate('validation.liveSessionRecordingUrlInvalid')),
    instructions: yup
      .string()
      .optional()
      .max(5000, translate('validation.liveSessionInstructionsMax')),
    recordedSession: yup
      .string()
      .optional()
      .url(translate('validation.liveSessionRecordedSessionInvalid')),
    durationInMinutes: yup
      .string()
      .transform((v) => (v === '' || v === null || v === undefined ? undefined : Number(v)))
      .required(translate('validation.liveSessionDurationRequired'))
      .min(0, translate('validation.liveSessionDurationMin'))
      .typeError(translate('validation.liveSessionDurationMustBeNumber'))
      .test(
        'valid-number',
        translate('validation.liveSessionDurationMustBeNumber'),
        (v) => v === undefined || v === null || !Number.isNaN(v)
      ),
  });
}

const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024;

function buildAttachmentContentSchema(translate: TranslateFn) {
  return yup.object({
    fileKey: yup
      .string()
      .required(translate('validation.attachmentFileKeyRequired'))
      .min(1, translate('validation.fileKeyEmpty')),
    fileSizeBytes: yup
      .number()
      .required(translate('validation.attachmentFileSizeRequired'))
      .min(1, translate('validation.fileSizeMin'))
      .max(MAX_ATTACHMENT_BYTES, translate('validation.attachmentFileSizeMax', { max: 30 })),
    mimeType: yup
      .string()
      .required(translate('validation.attachmentMimeTypeRequired'))
      .oneOf(
        [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        translate('validation.attachmentMimeTypeInvalid')
      ),
  });
}

export function getCourseContentCreationSchemaDiscriminated(translate: TranslateFn) {
  const base = buildBaseSchema(translate);
  const articleContentSchema = buildArticleContentSchema(translate);
  const videoContentSchema = buildVideoContentSchema(translate);
  const quizContentSchema = buildQuizContentSchema(translate);
  const assignmentContentSchema = buildAssignmentContentSchema(translate);
  const liveSessionContentSchema = buildLiveSessionContentSchema(translate);
  const attachmentContentSchema = buildAttachmentContentSchema(translate);

  return yup.object({
    ...base.fields,
    settings: yup.object({}).optional(),
    content: yup.lazy((_value, context) => {
      const parent = context?.parent as { type?: string } | undefined;
      const type = parent?.type;
      switch (type) {
        case CourseContentType.ARTICLE: {
          return articleContentSchema;
        }
        case CourseContentType.VIDEO: {
          return videoContentSchema;
        }
        case CourseContentType.QUIZ: {
          return quizContentSchema;
        }
        case CourseContentType.ASSIGNMENT: {
          return assignmentContentSchema;
        }
        case CourseContentType.LIVE_SESSION: {
          return liveSessionContentSchema;
        }
        case CourseContentType.ATTACHMENT: {
          return attachmentContentSchema;
        }
        default: {
          return yup.mixed().required(translate('validation.contentRequired'));
        }
      }
    }),
  });
}

const defaultTranslate: TranslateFn = (key) => key;
export const courseContentCreationSchemaDiscriminated =
  getCourseContentCreationSchemaDiscriminated(defaultTranslate);

export type CourseContentFormData = yup.InferType<
  ReturnType<typeof getCourseContentCreationSchemaDiscriminated>
>;
