import { ALLOWED_VARIABLES, TemplateContext } from '@darnozom/shared-types';

const VARIABLE_RE = /\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g;

export function extractVariables(body: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  for (const [, name] of body.matchAll(VARIABLE_RE)) {
    if (!seen.has(name)) {
      seen.add(name);
      found.push(name);
    }
  }
  return found;
}

export function validateVariables(context: TemplateContext, body: string): string[] {
  const allowed = new Set(ALLOWED_VARIABLES[context]);
  return extractVariables(body).filter((v) => !allowed.has(v));
}

export function renderTemplate(
  body: string,
  values: Record<string, string | undefined>,
): { text: string; missingVariables: string[] } {
  const missingVariables: string[] = [];
  const text = body.replace(VARIABLE_RE, (_, name: string) => {
    const val = values[name];
    if (val === undefined || val === null || val === '') {
      missingVariables.push(name);
      return '';
    }
    return val;
  });
  return { text, missingVariables };
}

export function normalizePhone(raw: string): string {
  const hasLeadingPlus = raw.trimStart().startsWith('+');
  const digits = raw.replace(/[^\d]/g, '');
  return hasLeadingPlus ? `+${digits}` : digits;
}
