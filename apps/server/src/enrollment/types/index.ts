/**
 * Types for enrollment documents with populated virtuals (e.g. from .populate().lean()).
 */

/** Certificate field shape on a lean enrollment document. */
export interface EnrollmentCertificateLean {
  issued?: boolean;
  issuedAt?: Date;
  certificateUrl?: string;
}

/**
 * Generic type for lean enrollment documents with populated virtuals.
 * Use for query results from .populate('user', ...).populate('course', ...).lean().
 *
 * @example
 * // Certificate context: user (firstName, lastName), course (name)
 * type CertificateEnrollment = EnrollmentLeanWithPopulated<
 *   { firstName?: string; lastName?: string },
 *   { name?: string }
 * >;
 */
export interface EnrollmentLeanWithPopulated<TUser = unknown, TCourse = unknown> {
  certificate?: EnrollmentCertificateLean;
  user?: TUser | null;
  course?: TCourse | null;
}

/** Populated user fields for certificate display. */
export interface EnrollmentPopulatedUserCertificate {
  firstName?: string;
  lastName?: string;
}

/** Populated course fields for certificate display. */
export interface EnrollmentPopulatedCourseCertificate {
  name?: string;
}

/** Lean enrollment with user and course populated for certificate use. */
export type EnrollmentLeanForCertificate = EnrollmentLeanWithPopulated<EnrollmentPopulatedUserCertificate, EnrollmentPopulatedCourseCertificate>;
