import { describe, expect, it } from 'vitest';
import {
  ALLOWED_VARIABLES,
  TemplateContext,
  VARIABLE_AR_NAMES,
  canonicalVariableName,
  variableTokenName,
} from './message-template.types';
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

describe('Arabic variable names', () => {
  it('has an Arabic name for every allowed variable, all distinct', () => {
    const all = new Set([...ALLOWED_VARIABLES.GROUP, ...ALLOWED_VARIABLES.STUDENT]);
    const arabic = [...all].map((k) => VARIABLE_AR_NAMES[k]);
    expect(arabic.every(Boolean)).toBe(true);
    expect(new Set(arabic).size).toBe(all.size);
  });
  it('canonicalVariableName maps Arabic back to the key and leaves others alone', () => {
    expect(canonicalVariableName('اسم_الطالب')).toBe('studentName');
    expect(canonicalVariableName('studentName')).toBe('studentName');
    expect(canonicalVariableName('unknown')).toBe('unknown');
  });
  it('variableTokenName picks the spelling for the locale', () => {
    expect(variableTokenName('groupName', 'ar')).toBe('اسم_المجموعة');
    expect(variableTokenName('groupName', 'en')).toBe('groupName');
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
