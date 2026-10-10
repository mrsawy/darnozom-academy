import { createHash } from 'node:crypto';

// In-memory storage (use Redis/database in production)
const storage = new Map<string, string>();

// Base62 for URL-safe short codes
const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function toBase62(num: number): string {
  if (num === 0) return chars[0];
  let result = '';
  while (num > 0) {
    result = chars[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

// fromBase62 function removed - not used

// Generate shortest possible ID
function generateShortId(text: string | Buffer): string {
  // Use hash to ensure uniqueness
  const hash = createHash('md5').update(text).digest('hex');

  // Convert first 8 hex chars to number, then to base62
  const num = Number.parseInt(hash.slice(0, 8), 16);
  return toBase62(num);
}

export function shorten(text: string): string {
  const id = generateShortId(text);
  storage.set(id, text);
  return id;
}

export function restore(id: string): string {
  const value = storage.get(id);
  if (value === undefined) {
    throw new Error('ID not found');
  }
  return value;
}

// Utility functions
export function clear(): void {
  storage.clear();
}

export function stats(): { count: number; sampleIds: string[] } {
  return {
    count: storage.size,
    sampleIds: [...storage.keys()].slice(0, 5),
  };
}

// Test function
export function test(text: string): { short: string; restored: string; match: boolean } {
  const short = shorten(text);
  const restored = restore(short);

  return { short, restored, match: restored === text };
}
