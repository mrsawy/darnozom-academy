'use client';

import { useMemo } from 'react';
import type { ICourse, TimeSlot } from '@/lib/types/course/course.interface';

export function useCourseSlots(course: ICourse | undefined): TimeSlot[] {
  return useMemo(() => {
    if (!course?.attendanceSettings?.offlineSchedule) return [];
    return course.attendanceSettings.offlineSchedule.filter((s) => !s.deletedAt);
  }, [course]);
}
