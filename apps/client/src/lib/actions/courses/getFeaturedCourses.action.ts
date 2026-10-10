'use server';

import { ICourse } from '@/lib/types/course/course.interface';
import { createNatsRequest } from '@/lib/utils/createNatsRequest';
import { redis } from '@/lib/redis/client';
import { parseDurationToSeconds } from '@/lib/utils';

const isICourseArray = (data: unknown): data is ICourse[] => {
  if (!Array.isArray(data) || data.length === 0) return false;
  return data.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const obj = item as Record<string, unknown>;
    return (
      typeof obj._id === 'string' &&
      typeof obj.organizationId === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.isPaid === 'boolean' &&
      typeof obj.pricing === 'object' &&
      obj.pricing !== null &&
      Array.isArray(obj.learningObjectives)
    );
  });
};

export const getFeaturedCourses = async ({ limit = 10 }: { limit?: number } = {}) => {
  const cachedFeaturedCourses = await redis.get(`featuredCourses-${limit}`);
  if (cachedFeaturedCourses) {
    const parsed: unknown = JSON.parse(cachedFeaturedCourses);
    if (isICourseArray(parsed)) {
      return parsed;
    }
  }
  const featuredCourses = await createNatsRequest<ICourse[]>('courses.getFeatured', { limit });
  const ttlInSeconds = parseDurationToSeconds('5h');
  await redis.set(`featuredCourses-${limit}`, JSON.stringify(featuredCourses), 'EX', ttlInSeconds);
  return featuredCourses;
};
