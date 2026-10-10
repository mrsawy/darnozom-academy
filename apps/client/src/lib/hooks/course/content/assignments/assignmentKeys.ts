/** React Query keys for assignment (content) submission APIs. */
export const assignmentKeys = {
  all: ['course-assignments'] as const,
  submissions: (assignmentId: string, studentId?: string) =>
    [...assignmentKeys.all, 'submissions', assignmentId, studentId ?? '__self__'] as const,
  submissionsInfinite: (assignmentId: string, pageSize: number) =>
    [...assignmentKeys.all, 'submissions-infinite', assignmentId, pageSize] as const,
};
