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
}
