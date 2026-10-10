export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Normalize accented characters
    .replaceAll(/[\u0300-\u036F]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars
    .replaceAll(/\s+/g, '-') // Replace spaces with dashes
    .replaceAll(/-+/g, '-'); // Collapse multiple dashes
}
