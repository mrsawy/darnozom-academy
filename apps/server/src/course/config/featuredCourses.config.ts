/**
 * Configuration for Featured Courses calculation
 *
 * This configuration controls how courses are scored and ranked
 * for the featured courses feature.
 */

export const NORMALIZATION_FACTORS = {
  // Course metrics normalization
  courseEnrollments: 1000,
  courseReviews: 100,
  courseViews: 5000,
  courseRating: 5, // 0-5 scale to 0-1

  // Organization metrics normalization
  orgReviews: 500,
  orgEnrollments: 2000,
  orgCourses: 100,
  orgRating: 5, // 0-5 scale to 0-1

  // Instructor metrics normalization
  instructorReviews: 100,
  instructorStudents: 1000,
  instructorCourses: 50,
  instructorRating: 5, // 0-5 scale to 0-1
} as const;

export const WEIGHTS = {
  course: {
    totalEnrollments: 0.3,
    totalReviews: 0.25,
    averageRating: 0.25,
    totalViews: 0.15,
  },
  organization: {
    averageCoursesRating: 0.1,
    totalCoursesReviews: 0.08,
    totalEnrollments: 0.1,
    totalCourses: 0.08,
  },
  instructor: {
    averageCoursesRating: 0.16,
    totalCoursesReviews: 0.14,
    totalStudents: 0.11,
    totalCourses: 0.09,
  },
  // Recency factor (negative weight favors newer courses)
  recency: -0.03,
} as const;

export const CAPS = {
  // Maximum normalized values to prevent outliers from dominating
  courseTotalEnrollments: 5000,
  courseTotalReviews: 500,
  courseTotalViews: 50_000,
  orgTotalCoursesReviews: 500,
  orgTotalEnrollments: 2000,
  orgTotalCourses: 100,
  instructorTotalCoursesReviews: 50_000,
  instructorTotalStudents: 500,
  instructorTotalCourses: 30,
} as const;

export const MINIMUM_THRESHOLDS = {
  totalEnrollments: 1,
  totalReviews: 1,
} as const;

export const SCALING_OPTIONS = {
  // Use logarithmic scaling for metrics with high variance
  useLogarithmicScaling: {
    enrollments: true,
    views: true,
    reviews: false,
    courses: false,
  },
} as const;

export const RECENCY_CONFIG = {
  // Enable recency factor (newer courses get slight boost)
  enabled: true,
  // Milliseconds in a year (for age calculation)
  millisecondsPerYear: 1000 * 60 * 60 * 24 * 365,
} as const;
