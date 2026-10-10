import type { Dispatch, SetStateAction } from 'react';
import { ICourseWithModules } from '@/lib/types/course/course.interface';

export type CourseFormMode = 'create' | 'update';

export interface CourseFormProps {
  mode: CourseFormMode;
  setOpen?: Dispatch<SetStateAction<boolean>>;
  course?: ICourseWithModules;
  courseId?: string;
}

export interface OfflineScheduleSlot {
  startTime: string;
  endTime: string;
  dayOfWeek: string;
  moduleId?: string;
  moduleName?: string;
  instructorsIds?: string[];
  coInstructorsIds?: string[];
  studentsIds?: string[];
}
