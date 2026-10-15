import { extractVariables, validateVariables, renderTemplate, normalizePhone } from './template-render';

describe('extractVariables', () => {
  it('extracts variable names from {{name}} syntax', () => {
    expect(extractVariables('Hello {{studentName}}, your group is {{groupName}}')).toEqual(['studentName', 'groupName']);
  });
  it('ignores {{ x }} with spaces inside braces', () => {
    expect(extractVariables('{{ invalid }} {{valid}}')).toEqual(['valid']);
  });
  it('returns empty array for no variables', () => {
    expect(extractVariables('Hello world')).toEqual([]);
  });
  it('deduplicates repeated variables', () => {
    expect(extractVariables('{{name}} and {{name}}')).toEqual(['name']);
  });
});

describe('validateVariables', () => {
  it('returns empty array for all known GROUP variables', () => {
    expect(validateVariables('GROUP', 'Join {{groupName}} starting {{startDate}}')).toEqual([]);
  });
  it('returns unknown variables for GROUP context using STUDENT-only variable', () => {
    expect(validateVariables('GROUP', '{{studentName}} joins {{groupName}}')).toContain('studentName');
  });
  it('returns empty array for STUDENT context using any allowed variable', () => {
    expect(validateVariables('STUDENT', '{{studentName}} in {{groupName}}')).toEqual([]);
  });
  it('returns truly unknown variable names', () => {
    expect(validateVariables('STUDENT', '{{unknownVar}}')).toEqual(['unknownVar']);
  });
});

describe('renderTemplate', () => {
  it('substitutes variables with provided values', () => {
    const { text } = renderTemplate('Hello {{studentName}}', { studentName: 'Ahmed' });
    expect(text).toBe('Hello Ahmed');
  });
  it('replaces missing variable with empty string and lists it', () => {
    const { text, missingVariables } = renderTemplate('Link: {{meetingLink}}', {});
    expect(text).toBe('Link: ');
    expect(missingVariables).toContain('meetingLink');
  });
  it('does not report a variable as missing if it has a value', () => {
    const { missingVariables } = renderTemplate('{{groupName}}', { groupName: 'Math 101' });
    expect(missingVariables).toHaveLength(0);
  });
  it('does not substitute {{ x }} with spaces', () => {
    const { text } = renderTemplate('{{ invalid }}', { invalid: 'oops' });
    expect(text).toBe('{{ invalid }}');
  });
});

describe('normalizePhone', () => {
  it('strips spaces and dashes', () => {
    expect(normalizePhone('+20 123 456-789')).toBe('+20123456789');
  });
  it('keeps leading plus', () => {
    expect(normalizePhone('+201234567890')).toBe('+201234567890');
  });
  it('strips all non-digit chars except leading plus', () => {
    expect(normalizePhone('(020) 123.456')).toBe('020123456');
  });
});
