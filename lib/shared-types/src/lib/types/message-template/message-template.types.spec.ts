import { describe, expect, it } from 'vitest';
import { ALLOWED_VARIABLES, TemplateContext } from './message-template.types';
import { MessageTemplateErrors } from '../../messages/message-template-errors.enum';
import { Subjects } from '../role/subject/subjects.enum';

describe('TemplateContext', () => {
  it('has STUDENT and GROUP values', () => {
    const values: TemplateContext[] = ['STUDENT', 'GROUP'];
    expect(values).toHaveLength(2);
  });
});

describe('ALLOWED_VARIABLES', () => {
  it('GROUP variables do not include studentName or parentName', () => {
    expect(ALLOWED_VARIABLES.GROUP).not.toContain('studentName');
    expect(ALLOWED_VARIABLES.GROUP).not.toContain('parentName');
  });
  it('STUDENT variables include all GROUP variables plus studentName and parentName', () => {
    expect(ALLOWED_VARIABLES.STUDENT).toContain('studentName');
    expect(ALLOWED_VARIABLES.STUDENT).toContain('parentName');
    for (const v of ALLOWED_VARIABLES.GROUP) {
      expect(ALLOWED_VARIABLES.STUDENT).toContain(v);
    }
  });
});

describe('MessageTemplateErrors', () => {
  it('has required error keys', () => {
    expect(MessageTemplateErrors.TEMPLATE_NOT_FOUND).toBeDefined();
    expect(MessageTemplateErrors.UNKNOWN_TEMPLATE_VARIABLE).toBeDefined();
    expect(MessageTemplateErrors.STUDENT_NOT_IN_GROUP).toBeDefined();
    expect(MessageTemplateErrors.TEMPLATE_NAME_TAKEN).toBeDefined();
  });
});

describe('Subjects', () => {
  it('has MESSAGE_TEMPLATE subject', () => {
    expect(Subjects.MESSAGE_TEMPLATE).toBe('MESSAGE_TEMPLATE');
  });
});
