import { Model, Types } from 'mongoose';
import { Organization } from '../entities/organization.entity';
import { fakerAR as faker } from '@faker-js/faker';
import { ReviewType } from 'src/review/enum/reviewType.enum';
import { Enrollment } from 'src/enrollment/entities/enrollment.entity';
import { Review } from 'src/review/entities/review.entity';
import { Course } from 'src/course/entities/course.entity';
import { EntityStatus, VerificationStatus, IdentityDocumentType, ApprovalStatus } from '@lms-organization/shared-types';

export class OrganizationSeeder {
  constructor(
    private readonly organizationModel: Model<Organization>,
    private readonly enrollmentModel?: Model<Enrollment>,
    private readonly reviewModel?: Model<Review>,
    private readonly courseModel?: Model<Course>
  ) {}

  async seed(
    superAdminId: Types.ObjectId,
    planName: string,
    overrides: Partial<Organization> & {
      entityStatus?: EntityStatus;
      emailVerified?: boolean;
      verificationStatus?: VerificationStatus;
      identityDocumentType?: IdentityDocumentType;
      approvalStatus?: ApprovalStatus;
    } = {}
  ) {
    const { entityStatus, emailVerified, verificationStatus, identityDocumentType, approvalStatus, ...orgOverrides } = overrides;

    const name = orgOverrides.name ?? faker.company.name();
    const slug = faker.helpers.slugify(name).toLowerCase() + '-' + faker.string.alphanumeric(5);

    const emailVerifiedValue = emailVerified ?? false;
    const identityStatus = verificationStatus ?? VerificationStatus.UNVERIFIED;

    const organization = {
      name,
      superAdminId,
      slug,
      planName,
      status: entityStatus ?? EntityStatus.ACTIVE,
      // All seeded orgs are approved by default (override for admin-queue samples).
      approvalStatus: approvalStatus ?? ApprovalStatus.APPROVED,
      approvalComment: null,
      approvalReviewedBy: null,
      approvalReviewedAt: (approvalStatus ?? ApprovalStatus.APPROVED) === ApprovalStatus.APPROVED ? faker.date.recent({ days: 30 }) : null,
      settings: {
        branding: {
          logo: faker.image.url(),
          primaryColor: faker.color.rgb(),
          secondaryColor: faker.color.rgb(),
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
        },
      },
      verification: {
        email: {
          verified: emailVerifiedValue,
          verifiedAt: emailVerifiedValue ? faker.date.past() : null,
          failedAttempts: emailVerifiedValue ? 0 : faker.number.int({ min: 0, max: 3 }),
          lockedUntil: null,
        },
        identity: buildIdentityVerification(identityStatus, identityDocumentType),
      },
      ...orgOverrides,
    };

    return await this.organizationModel.create(organization);
  }

  async updateOrganizationStats(organizationId: Types.ObjectId, totalCourses?: number) {
    if (!this.enrollmentModel || !this.reviewModel || !this.courseModel) {
      throw new Error('Enrollment, Review, and Course models must be provided to update organization stats');
    }

    const totalEnrollments = await this.enrollmentModel.countDocuments({ organizationId });

    const organizationReviews = await this.reviewModel.find({
      reviewType: ReviewType.ORGANIZATION,
      reviewedOrganizationId: organizationId,
      isActive: true,
    });

    const totalReviews = organizationReviews.length;
    const sumRatings = organizationReviews.reduce((sum, r) => sum + ((r as unknown as { rating?: number }).rating ?? 0), 0);
    const averageRating = totalReviews > 0 ? Math.round((sumRatings / totalReviews) * 10) / 10 : 0;

    // Calculate courses-level stats
    const courseReviews = await this.reviewModel
      .find({
        reviewType: ReviewType.COURSE,
        isActive: true,
      })
      .lean();

    // Only count course reviews for courses in this org
    const orgCourses = await this.courseModel.find({ organizationId }).select('_id').lean();
    const orgCourseIds = new Set(orgCourses.map((c) => c._id.toString()));

    const relevantCourseReviews = courseReviews.filter((r) => {
      const rid = (r as unknown as { courseId?: { toString(): string } }).courseId;
      return rid && orgCourseIds.has(rid.toString());
    });

    const totalCoursesReviews = relevantCourseReviews.length;
    const coursesRatingSum = relevantCourseReviews.reduce((sum, r) => sum + ((r as unknown as { rating?: number }).rating ?? 0), 0);
    const averageCoursesRating = totalCoursesReviews > 0 ? Math.round((coursesRatingSum / totalCoursesReviews) * 10) / 10 : 0;

    let finalTotalCourses = totalCourses;
    finalTotalCourses ??= (await this.courseModel.countDocuments({ organizationId })) ?? 0;

    await this.organizationModel.findByIdAndUpdate(organizationId, {
      $set: {
        'stats.totalCourses': finalTotalCourses,
        'stats.totalEnrollments': totalEnrollments,
        'stats.totalReviews': totalReviews,
        'stats.averageRating': averageRating,
        'stats.totalCoursesReviews': totalCoursesReviews,
        'stats.averageCoursesRating': averageCoursesRating,
      },
    });
  }
}

function buildIdentityVerification(
  status: VerificationStatus,
  documentType?: IdentityDocumentType
): {
  status: VerificationStatus;
  documentType: IdentityDocumentType | null;
  fileKeys: string[];
  rejectionMessage: string | null;
  submittedAt: Date | null;
  reviewedBy: null;
  reviewedAt: Date | null;
} {
  const base = {
    status,
    documentType: documentType ?? null,
    fileKeys: [] as string[],
    rejectionMessage: null as string | null,
    submittedAt: null as Date | null,
    reviewedBy: null,
    reviewedAt: null as Date | null,
  };

  switch (status) {
    case VerificationStatus.PENDING: {
      return {
        ...base,
        documentType: documentType ?? IdentityDocumentType.NATIONAL_ID,
        fileKeys: [`private/verification/${faker.string.alphanumeric(16)}.pdf`],
        submittedAt: faker.date.recent({ days: 14 }),
      };
    }
    case VerificationStatus.VERIFIED: {
      return {
        ...base,
        documentType: documentType ?? IdentityDocumentType.NATIONAL_ID,
        fileKeys: [`private/verification/${faker.string.alphanumeric(16)}.pdf`],
        submittedAt: faker.date.past({ years: 1 }),
        reviewedAt: faker.date.recent({ days: 30 }),
      };
    }
    case VerificationStatus.REJECTED: {
      return {
        ...base,
        documentType: documentType ?? IdentityDocumentType.NATIONAL_ID,
        fileKeys: [`private/verification/${faker.string.alphanumeric(16)}.pdf`],
        submittedAt: faker.date.past({ years: 1 }),
        rejectionMessage: 'المستندات المقدمة غير واضحة، يرجى إعادة الرفع.',
        reviewedAt: faker.date.recent({ days: 60 }),
      };
    }
    default: {
      return base;
    }
  }
}
