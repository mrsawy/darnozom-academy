export interface SubmittedAnswerDto {
  questionIndex: number;
  selectedOption: number;
}

export interface QuizIntegrityEventDto {
  type: string;
  at: string;
  detail?: string;
}

export interface SubmitQuizDto {
  quizId: string;
  answers: SubmittedAnswerDto[];
  timeTakenInSeconds?: number;
  enrollmentId: string;
  integrityEvents?: QuizIntegrityEventDto[];
}

export interface SubmitQuizResponse {
  message: string;
  result: {
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    attemptNumber: number;
    attemptsLeft: number;
    feedback: string;
    submittedAt: Date;
    timeTakenInSeconds?: number;
    detailedAnswers: unknown[];
  };
  success: boolean;
  error?: string;
}

/** Stored per-question breakdown from `quiz.service` (matches server `detailedAnswers`). */
export interface QuizSubmissionStoredAnswerDetail {
  questionIndex: number;
  questionText: string;
  options: string[];
  correctOption: number;
  /** `-1` = unanswered (e.g. time-up partial submit). */
  selectedOption: number;
  isCorrect: boolean;
}

/** One attempt row for the signed-in student (`course.getStudentQuizSubmissions`). */
export interface StudentQuizSubmissionItem {
  studentId: string;
  studentName: string;
  score: number;
  attemptNumber: number;
  submittedAt: Date;
  timeTakenInSeconds?: number;
  feedback?: string;
  answers?: QuizSubmissionStoredAnswerDetail[];
  integrityEvents?: QuizIntegrityEventDto[];
}

export interface GetStudentQuizSubmissionsResponse {
  contentId: string;
  title: string;
  submissions: StudentQuizSubmissionItem[];
}

/** Paginated list of all student attempts for a quiz (`course.getQuizSubmissionsForOrganization`). */
export interface GetQuizSubmissionsForOrganizationResponse {
  items: StudentQuizSubmissionItem[];
  total: number;
  page: number;
  limit: number;
}
