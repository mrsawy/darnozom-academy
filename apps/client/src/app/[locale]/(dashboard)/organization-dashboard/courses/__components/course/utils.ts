import { slugify } from '@/lib/utils/slugify';

export function buildPublicFileKey(file: File, customPath: string): string {
  const lastDotIndex = file.name.lastIndexOf('.');
  const fileExtension = lastDotIndex > 0 ? file.name.slice(lastDotIndex + 1) : '';
  const baseFileName = lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;
  const slugifiedBaseName = slugify(baseFileName);
  const normalizedName = fileExtension
    ? `${slugifiedBaseName}.${fileExtension}`
    : slugifiedBaseName;
  return `${customPath}/${crypto.randomUUID()}_${normalizedName}`;
}

export function ensurePublicKey(fileKey: string): string {
  const trimmed = fileKey.trim().replace(/^\/+/, '');
  if (trimmed.startsWith('public/') || trimmed.startsWith('private/')) {
    return trimmed;
  }
  return `public/${trimmed}`;
}
