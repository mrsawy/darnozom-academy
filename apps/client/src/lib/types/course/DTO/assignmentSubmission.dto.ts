export interface SubmitAssignmentPayload {
  assignmentId: string;
  enrollmentId: string;
  content?: string;
  fileKey?: string;
  fileSizeBytes?: number;
  mimeType?: string;
}

export interface AssignmentSubmissionInfo {
  studentId: string;
  /** Resolved on the server from the user profile (first/last name, else username/email). */
  studentName?: string;
  fileKey?: string;
  /** Signed URL to view/download the submitted file (when fileKey is present). */
  fileUrl?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  content?: string;
  score?: number;
  feedback?: string;
  submittedAt?: string;
}

/** Assignment metadata returned with submission(s) from `course.getAssignmentSubmissions`. */
export interface AssignmentSubmissionsMeta {
  dueDate: string;
  maxPoints?: number;
  instructions?: string;
  content?: string;
}

export interface GetAssignmentSubmissionsResponse {
  submission?: AssignmentSubmissionInfo | null;
  submissions?: AssignmentSubmissionInfo[];
  assignment: AssignmentSubmissionsMeta;
  /** Present when `allSubmissions` + pagination is used. */
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

/** Payload for `course.gradeAssignment` (matches server GradeAssignmentDto). */
export interface GradeAssignmentPayload {
  assignmentId: string;
  studentId: string;
  score: number;
  feedback?: string;
}

export interface GradeAssignmentResponse {
  message: string;
  score: number;
  feedback?: string;
}
