export type TemplateContext = 'STUDENT' | 'GROUP';

const GROUP_VARIABLES = [
  'groupName',
  'courseName',
  'levelName',
  'teacherName',
  'startDate',
  'schedule',
  'meetingLink',
  'whatsappGroupLink',
] as const;

const STUDENT_VARIABLES = [...GROUP_VARIABLES, 'studentName', 'parentName'] as const;

export const ALLOWED_VARIABLES: Record<TemplateContext, readonly string[]> = {
  GROUP: GROUP_VARIABLES,
  STUDENT: STUDENT_VARIABLES,
};

export type TemplateLocale = 'en' | 'ar';

/**
 * Arabic spellings of the template variables. Templates are stored with the canonical
 * (English) keys, but an Arabic-speaking admin may write `{{اسم_الطالب}}` instead — the
 * server accepts both and resolves them to the canonical key.
 */
export const VARIABLE_AR_NAMES: Record<string, string> = {
  groupName: 'اسم_المجموعة',
  courseName: 'اسم_الدورة',
  levelName: 'اسم_المستوى',
  teacherName: 'اسم_المدرس',
  startDate: 'تاريخ_البدء',
  schedule: 'الجدول',
  meetingLink: 'رابط_الاجتماع',
  whatsappGroupLink: 'رابط_مجموعة_واتساب',
  studentName: 'اسم_الطالب',
  parentName: 'اسم_ولي_الأمر',
};

const AR_NAME_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(VARIABLE_AR_NAMES).map(([key, ar]) => [ar, key]),
);

/** Resolves an Arabic (or already canonical) variable name to its canonical key. */
export function canonicalVariableName(name: string): string {
  return AR_NAME_TO_KEY[name] ?? name;
}

/** The token spelling to show/insert for a variable in the given locale. */
export function variableTokenName(key: string, locale: TemplateLocale): string {
  return locale === 'ar' ? (VARIABLE_AR_NAMES[key] ?? key) : key;
}

export interface IMessageTemplate {
  _id: string;
  organizationId: string;
  name: string;
  context: TemplateContext;
  body: string;
  createdBy: string | null;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface RenderTemplateResult {
  text: string;
  missingVariables: string[];
  phone?: string;
  waLink?: string;
  /** Whose phone `phone`/`waLink` belong to. */
  recipient?: 'STUDENT' | 'PARENT';
}

export interface CreateMessageTemplateDto {
  name: string;
  context: TemplateContext;
  body: string;
}

export interface UpdateMessageTemplateDto {
  name?: string;
  body?: string;
}

export interface RenderMessageTemplateDto {
  groupId: string;
  studentId?: string;
  /** Language used for localized values such as the schedule's day names. Defaults to 'en'. */
  locale?: TemplateLocale;
}
