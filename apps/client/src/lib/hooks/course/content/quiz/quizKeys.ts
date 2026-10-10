/** React Query keys for quiz content APIs (student own submissions, etc.). */
export const quizKeys = {
  all: ['course-quiz'] as const,
  studentSubmissions: (quizContentId: string) =>
    [...quizKeys.all, 'student-submissions', quizContentId] as const,
  orgSubmissionsInfinite: (quizContentId: string, pageSize: number) =>
    [...quizKeys.all, 'org-submissions', quizContentId, pageSize] as const,
};
