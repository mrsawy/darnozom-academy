export enum CertificateStatus {
  ELIGIBLE = 'ELIGIBLE',
  NAME_REVIEW = 'NAME_REVIEW',
  ISSUED = 'ISSUED',
}

export enum FinalResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
}

export interface ICertificateRules {
  minAttendancePercent?: number; // 0-100
  minHomeworkAverage?: number; // 1-5
  requireExamPass?: boolean;
  requireFullyPaid?: boolean;
}

export interface ICertificateEligibility {
  attendancePercent: number;
  homeworkAverage: number;
  examPassed?: boolean;
  fullyPaid?: boolean;
  rulesSnapshot: ICertificateRules;
  isEligible: boolean;
  failedRules?: string[];
}

export interface ICertificate {
  _id: string;
  organizationId: string;
  groupId: string;
  levelId: string;
  courseId: string;
  studentId: string;
  status: CertificateStatus;
  eligibility: ICertificateEligibility;
  nameAr: string;
  nameEn: string;
  nameConfirmedBy?: string;
  nameConfirmedAt?: string | Date;
  serial?: string;
  verificationToken?: string;
  issuedBy?: string;
  issuedAt?: string | Date;
  qrCodeDataUrl?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PublicCertificateVerification {
  studentNameAr: string;
  studentNameEn: string;
  courseName: string;
  levelName: string;
  organizationName: string;
  serial: string;
  issuedAt: string | Date;
}

export interface SetStudentFinalResultDto {
  finalResult: FinalResult;
}

export interface UpdateCertificateNameDto {
  nameAr: string;
  nameEn: string;
}

export interface GetCertificatesFilterDto {
  groupId?: string;
  studentId?: string;
  status?: CertificateStatus;
}
