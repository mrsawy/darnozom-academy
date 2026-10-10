export type QuizAvailabilityStatus = 'upcoming' | 'active' | 'ended';

export interface QuizAvailability {
  status: QuizAvailabilityStatus;
  quizStartDate: Date | null;
  quizEndDate: Date | null;
}

export function getQuizAvailability(
  now: Date,
  quizStartDate?: string | Date | null,
  quizEndDate?: string | Date | null
): QuizAvailability {
  const start = quizStartDate ? new Date(quizStartDate) : null;
  const end = quizEndDate ? new Date(quizEndDate) : null;

  if (start && now < start) {
    return { status: 'upcoming', quizStartDate: start, quizEndDate: end };
  }
  if (end && now > end) {
    return { status: 'ended', quizStartDate: start, quizEndDate: end };
  }
  return { status: 'active', quizStartDate: start, quizEndDate: end };
}
