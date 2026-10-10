/**
 * Configuration for Featured Instructors calculation
 *
 * This configuration controls how instructors are scored and ranked
 * for the featured instructors feature.
 */

export const NORMALIZATION_FACTORS = {
  // Instructor metrics normalization
  instructorReviews: 100,
  instructorStudents: 1000,
  instructorCourses: 50,

  // Organization metrics normalization
  orgReviews: 500,
  orgEnrollments: 2000,
  orgCourses: 100,

  // Rating normalization (0-5 scale to 0-1)
  ratingScale: 5,
} as const;

export const WEIGHTS = {
  instructor: {
    totalCoursesReviews: 0.35,
    averageCoursesRating: 0.25,
    totalStudents: 0.3,
    totalCourses: 0.2,
  },
  organization: {
    totalCoursesReviews: 0.1,
    averageCoursesRating: 0.1,
    totalEnrollments: 0.2,
    totalCourses: 0.2,
  },
  // Recency factor (negative weight favors newer accounts)
  recency: -0.05,
} as const;

export const CAPS = {
  // Maximum normalized values to prevent outliers from dominating
  instructorTotalCoursesReviews: 50_000,
  instructorTotalStudents: 500,
  instructorTotalCourses: 30,
  orgTotalCoursesReviews: 500,
  orgTotalEnrollments: 2000,
  orgTotalCourses: 100,
} as const;

export const MINIMUM_THRESHOLDS = {
  // Minimum values required for an instructor to be considered featured.
  // Reviews are factored into the score but are NOT a hard gate — an instructor
  // with zero reviews still appears; they simply rank lower than reviewed peers.
  totalCourses: 1,
} as const;

export const SCALING_OPTIONS = {
  // Use logarithmic scaling for metrics with high variance
  useLogarithmicScaling: {
    students: true,
    reviews: false,
    courses: false,
  },
} as const;

export const RECENCY_CONFIG = {
  // Enable recency factor (newer instructors get slight boost)
  enabled: true,
  // Milliseconds in a year (for age calculation)
  millisecondsPerYear: 1000 * 60 * 60 * 24 * 365,
} as const;
