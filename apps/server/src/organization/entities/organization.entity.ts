import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import mongoose, { Document, Types } from 'mongoose';
import {
  VerificationStatus,
  IdentityDocumentType,
  EntityStatus,
  ApprovalStatus,
  PAYMENT_METHOD_RECEIPT_UPLOAD,
  PaymentProvider,
} from '@darnozom/shared-types';

@Schema({ timestamps: true })
export class Organization extends Document<Types.ObjectId> {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ required: true, type: mongoose.Types.ObjectId })
  superAdminId: mongoose.Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ required: true, type: String })
  planName: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'Subscription', required: false })
  subscriptionId: mongoose.Types.ObjectId | null;

  @Prop({
    type: {
      branding: {
        logo: String,
        primaryColor: String,
        secondaryColor: String,
      },
      notifications: {
        emailEnabled: Boolean,
        smsEnabled: Boolean,
      },
    },
    default: {
      branding: {
        primaryColor: '#000',
        secondaryColor: '#fff',
      },
      notifications: {
        emailEnabled: false,
        smsEnabled: false,
      },
    },
    required: true,
  })
  settings: {
    branding: {
      logo: string;
      primaryColor: string;
      secondaryColor: string;
    };
    notifications: {
      emailEnabled: boolean;
      smsEnabled: boolean;
    };
  };

  @Prop({
    type: {
      totalReviews: Number,
      averageRating: Number,
      averageCoursesRating: Number,
      totalCoursesReviews: Number,
      totalEnrollments: Number,
      totalCourses: Number,
    },
    default: {
      totalReviews: 0,
      averageRating: 0,
      averageCoursesRating: 0,
      totalCoursesReviews: 0,
      totalEnrollments: 0,
      totalCourses: 0,
    },
    required: false,
  })
  stats: {
    totalReviews: number;
    averageRating: number;
    averageCoursesRating: number;
    totalCoursesReviews: number;
    totalEnrollments: number;
    totalCourses: number;
  };

  @Prop({
    type: {
      email: {
        verified: { type: Boolean, default: false },
        verifiedAt: { type: Date, default: null },
        failedAttempts: { type: Number, default: 0 },
        lockedUntil: { type: Date, default: null },
      },
      identity: {
        status: { type: String, enum: VerificationStatus, default: VerificationStatus.UNVERIFIED },
        documentType: { type: String, enum: IdentityDocumentType, default: null },
        fileKeys: { type: [String], default: [] },
        rejectionMessage: { type: String, default: null },
        submittedAt: { type: Date, default: null },
        reviewedBy: { type: mongoose.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
      },
    },
    default: {
      email: { verified: false, verifiedAt: null, failedAttempts: 0, lockedUntil: null },
      identity: {
        status: VerificationStatus.UNVERIFIED,
        documentType: null,
        fileKeys: [],
        rejectionMessage: null,
        submittedAt: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    },
  })
  verification: {
    email: {
      verified: boolean;
      verifiedAt: Date | null;
      failedAttempts: number;
      lockedUntil: Date | null;
    };
    identity: {
      status: VerificationStatus;
      documentType: IdentityDocumentType | null;
      fileKeys: string[];
      rejectionMessage: string | null;
      submittedAt: Date | null;
      reviewedBy: mongoose.Types.ObjectId | null;
      reviewedAt: Date | null;
    };
  };

  @Prop({ type: String, enum: EntityStatus, default: EntityStatus.ACTIVE, index: true })
  status: EntityStatus;

  /**
   * Platform-admin account-approval gate. New orgs start PENDING and cannot
   * create content until an admin approves. Approval also auto-approves the
   * org's content going forward (see isOrgApproved).
   */
  @Prop({ type: String, enum: ApprovalStatus, default: ApprovalStatus.PENDING, index: true })
  approvalStatus: ApprovalStatus;

  @Prop({ type: String, default: null })
  approvalComment: string | null;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'User', default: null })
  approvalReviewedBy: mongoose.Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvalReviewedAt: Date | null;

  /** Which family payment methods this academy offers. Empty or unset means receipt upload only. */
  @Prop({ type: [String], default: [PAYMENT_METHOD_RECEIPT_UPLOAD] })
  enabledFamilyPaymentMethods: string[];

  /** Which configured provider the online gateway method uses for academy fees. */
  @Prop({ type: String, enum: Object.values(PaymentProvider), required: false, default: null })
  academyFeeGatewayProvider: PaymentProvider | null;

  /** IANA timezone for this organization (e.g. 'Africa/Cairo', 'Asia/Riyadh'). Defaults to 'UTC'. */
  @Prop({ type: String, default: 'UTC' })
  timezone: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

OrganizationSchema.plugin(mongoosePaginate);

OrganizationSchema.virtual('plan', {
  ref: 'Plan',
  localField: 'planName',
  foreignField: 'name',
  justOne: true,
});
OrganizationSchema.virtual('superAdmin', {
  ref: 'User',
  localField: 'superAdminId',
  foreignField: '_id',
  justOne: true,
});
OrganizationSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true,
});
OrganizationSchema.virtual('subscription', {
  ref: 'Subscription',
  localField: 'subscriptionId',
  foreignField: '_id',
  justOne: true,
});
