/**
 * Compare `messages/en.json` vs `messages/ar.json` for the client web app.
 * Exits with code 1 if Arabic is missing keys, has empty strings, has type
 * mismatches, or has extra keys vs English.
 *
 * Mirrors `apps/lms-mobile/scripts/check-i18n-translations.ts`, adapted for
 * next-intl (flat `messages/` directory, no `translation` namespace wrapper).
 *
 * Run from `apps/client`: `pnpm i18n:check-keys`
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = join(__dirname, '../messages');

type Json = Record<string, unknown>;

function isPlainObject(v: unknown): v is Json {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function walkEnAgainstAr(
  en: Json,
  ar: unknown,
  base: string,
  missingInAr: string[],
  emptyInAr: string[],
  typeMismatch: string[]
): void {
  for (const key of Object.keys(en)) {
    const path = base ? `${base}.${key}` : key;
    const ev = en[key];
    const av = isPlainObject(ar) ? ar[key] : undefined;

    if (typeof ev === 'string') {
      if (av === undefined) {
        missingInAr.push(path);
      } else if (typeof av !== 'string') {
        typeMismatch.push(path);
      } else if (av.trim() === '') {
        emptyInAr.push(path);
      }
    } else if (isPlainObject(ev)) {
      if (av === undefined) {
        missingInAr.push(path);
      } else if (isPlainObject(av)) {
        walkEnAgainstAr(ev, av, path, missingInAr, emptyInAr, typeMismatch);
      } else {
        typeMismatch.push(path);
      }
    }
  }
}

function walkExtraInAr(en: Json, ar: Json, base: string, extraInAr: string[]): void {
  for (const key of Object.keys(ar)) {
    const path = base ? `${base}.${key}` : key;
    if (!(key in en)) {
      extraInAr.push(path);
      continue;
    }
    const ev = en[key];
    const av = ar[key];
    if (isPlainObject(ev) && isPlainObject(av)) {
      walkExtraInAr(ev, av, path, extraInAr);
    }
  }
}

function main() {
  const en = JSON.parse(readFileSync(join(MESSAGES_DIR, 'en.json'), 'utf8')) as Json;
  const ar = JSON.parse(readFileSync(join(MESSAGES_DIR, 'ar.json'), 'utf8')) as Json;

  const missingInAr: string[] = [];
  const emptyInAr: string[] = [];
  const typeMismatch: string[] = [];
  const extraInAr: string[] = [];

  walkEnAgainstAr(en, ar, '', missingInAr, emptyInAr, typeMismatch);
  walkExtraInAr(en, ar, '', extraInAr);

  if (
    missingInAr.length === 0 &&
    emptyInAr.length === 0 &&
    typeMismatch.length === 0 &&
    extraInAr.length === 0
  ) {
    console.log('i18n: en/ar message structures match; no missing or empty Arabic string leaves.');
    process.exit(0);
  }

  if (missingInAr.length > 0) {
    console.error('Missing in ar.json (present in en.json):\n', missingInAr.join('\n'));
  }
  if (emptyInAr.length > 0) {
    console.error('Empty string in ar.json:\n', emptyInAr.join('\n'));
  }
  if (typeMismatch.length > 0) {
    console.error(
      'Type mismatch (expected string/object like en.json):\n',
      typeMismatch.join('\n')
    );
  }
  if (extraInAr.length > 0) {
    console.error('Extra keys in ar.json (not in en.json):\n', extraInAr.join('\n'));
  }

  process.exit(1);
}

main();
