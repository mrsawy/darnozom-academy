export interface EnrollmentProgressConfig {
  progressPercentage: number; // 0-100
}

export interface EnrollmentSeedConfig {
  enrollments: EnrollmentProgressConfig[];
}
