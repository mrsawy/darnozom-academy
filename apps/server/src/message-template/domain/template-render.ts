import { ALLOWED_VARIABLES, canonicalVariableName, TemplateContext } from '@darnozom/shared-types';

// Letters include Arabic, so `{{اسم_الطالب}}` is a variable just like `{{studentName}}`.
const VARIABLE_RE = /\{\{(\p{L}[\p{L}\p{N}_]*)\}\}/gu;

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
  return extractVariables(body).filter((v) => !allowed.has(canonicalVariableName(v)));
}

/** Canonical (English) keys of the variables a body uses, whichever spelling it was written in. */
export function canonicalVariables(body: string): string[] {
  return [...new Set(extractVariables(body).map(canonicalVariableName))];
}

export function renderTemplate(
  body: string,
  values: Record<string, string | undefined>,
): { text: string; missingVariables: string[] } {
  const missingVariables: string[] = [];
  const text = body.replace(VARIABLE_RE, (_, rawName: string) => {
    const name = canonicalVariableName(rawName);
    const val = values[name];
    if (val === undefined || val === null || val === '') {
      if (!missingVariables.includes(name)) missingVariables.push(name);
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
