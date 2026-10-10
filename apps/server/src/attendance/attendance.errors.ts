export const AttendanceErrors = {
  SLOT_REQUIRED: 'Slot ID is required',
  SLOT_NOT_FOUND: 'Slot does not exist on this course or has been deleted',
  STUDENT_NOT_IN_SLOT_ROSTER: 'Student is not assigned to this slot',
  ABSENT_STATUS_NOT_ALLOWED: 'ABSENT status cannot be set manually; absence is derived automatically',
} as const;
