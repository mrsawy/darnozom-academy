import { AttendanceStatus, SessionRosterEntry } from '@/lib/types/attendance/attendance.types';
import { TimeSlot } from '@/lib/types/course/course.interface';

export interface SlotOverride {
  status: AttendanceStatus | null;
  notes: string;
}

export type OverridesMap = Record<string, SlotOverride>;

export interface SlotSessionPanelProps {
  courseId: string;
  slot: TimeSlot;
  date: Date;
  roster: SessionRosterEntry[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  search: string;
  pendingCount: number;
  isLoading: boolean;
  isFetching: boolean;
  overrides: OverridesMap;
  onOverrideChange: (studentId: string, override: Partial<SlotOverride>) => void;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onSave: () => void;
  isSaving: boolean;
  /** Autofocus the search box (single-slot mode) so a hardware laser scanner can fill it hands-free. */
  autoFocusSearch?: boolean;
}
