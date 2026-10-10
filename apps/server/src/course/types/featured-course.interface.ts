import { Types } from 'mongoose';

/** Stats attached to a featured course from its organization aggregation */
export interface FeaturedCourseOrganizationStats {
  totalCourses: number;
  totalEnrollments: number;
  totalCoursesReviews: number;
  averageCoursesRating: number;
}

/** Organization snippet attached to a featured course */
export interface FeaturedCourseOrganization {
  _id: Types.ObjectId;
  name: string;
  slug: string;
}

/** Stats attached to a featured course from its instructor aggregation */
export interface FeaturedCourseInstructorStats {
  totalCoursesReviews: number;
  averageCoursesRating: number;
  totalStudents: number;
  totalCourses: number;
}

/** Instructor snippet attached to a featured course */
export interface FeaturedCourseInstructor {
  _id: Types.ObjectId;
  username: string;
  firstName: string;
  lastName: string;
  profile?: {
    avatar?: string;
  };
}

/** Category item in the populated categories array */
export interface FeaturedCourseCategory {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  organizationId: Types.ObjectId;
  parentId?: Types.ObjectId;
}

/** Localized lookup snippet for the optional Grade / SchoolType relations */
export interface FeaturedCourseLocalizedLookup {
  _id: Types.ObjectId;
  nameEn: string;
  nameAr: string;
}

/**
 * Shape of a course document returned by the featured courses aggregation.
 * Includes core course fields plus featuredScore, organizationStats, organization,
 * instructorStats, instructor, and populated categories.
 */
export interface FeaturedCourse {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  createdBy: string;
  categoriesIds: Types.ObjectId[];
  modulesIds: Types.ObjectId[];
  isPaid: boolean;
  instructorId?: Types.ObjectId;
  coInstructorsIds?: Types.ObjectId[];
  description?: string;
  shortDescription?: string;
  learningObjectives?: string[];
  thumbnailKey: string;
  trailerKey?: string;
  pricing?: unknown;
  settings?: unknown;
  stats?: unknown;
  attendanceSettings?: unknown;
  paypalPlanId?: string;
  createdAt: Date;
  updatedAt: Date;
  featuredScore: number;
  organizationStats: FeaturedCourseOrganizationStats;
  organization: FeaturedCourseOrganization | null;
  instructorStats: FeaturedCourseInstructorStats;
  instructor: FeaturedCourseInstructor | null;
  categories: FeaturedCourseCategory[];
  grade?: FeaturedCourseLocalizedLookup | null;
  schoolTypes?: FeaturedCourseLocalizedLookup[];
}
