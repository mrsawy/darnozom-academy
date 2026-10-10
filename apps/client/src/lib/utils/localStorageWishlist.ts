'use client';

import { ICourse } from '@/lib/types/course/course.interface';

const WISHLIST_STORAGE_KEY = 'wishlist-courses';

interface LocalWishlistItem {
  courseId: string;
  course?: ICourse;
}

// Legacy support: check if stored data is old format (string[])
function isLegacyFormat(data: unknown): data is string[] {
  return Array.isArray(data) && data.length > 0 && typeof data[0] === 'string';
}

export function getLocalWishlist(): LocalWishlistItem[] {
  if (globalThis.window === undefined) return [];
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    // Handle legacy format (array of strings)
    if (isLegacyFormat(parsed)) {
      // Migrate to new format
      const migrated = parsed.map((courseId: string) => ({ courseId }));
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return parsed as LocalWishlistItem[];
  } catch {
    return [];
  }
}

export function addToLocalWishlist(courseId: string, course?: ICourse): void {
  if (globalThis.window === undefined) return;
  try {
    const current = getLocalWishlist();
    // Check if course already exists
    const exists = current.some((item) => item.courseId === courseId);
    if (!exists) {
      localStorage.setItem(
        WISHLIST_STORAGE_KEY,
        JSON.stringify([...current, { courseId, course }])
      );
    } else if (course) {
      // Update existing item with course data if provided
      const updated = current.map((item) =>
        item.courseId === courseId ? { ...item, course } : item
      );
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Silent fail for localStorage operations
  }
}

export function removeFromLocalWishlist(courseId: string): void {
  if (globalThis.window === undefined) return;
  try {
    const current = getLocalWishlist();
    localStorage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify(current.filter((item) => item.courseId !== courseId))
    );
  } catch {
    // Silent fail for localStorage operations
  }
}

export function isInLocalWishlist(courseId: string): boolean {
  return getLocalWishlist().some((item) => item.courseId === courseId);
}

export function getLocalWishlistCourseIds(): string[] {
  return getLocalWishlist().map((item) => item.courseId);
}

export function clearLocalWishlist(): void {
  if (globalThis.window === undefined) return;
  localStorage.removeItem(WISHLIST_STORAGE_KEY);
}
