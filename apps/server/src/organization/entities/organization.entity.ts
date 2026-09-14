import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import mongoose, { Document, Types } from 'mongoose';
import { VerificationStatus, IdentityDocumentType, EntityStatus, ApprovalStatus } from '@islamic-academy/shared-types';

@Schema({ timestamps: true })
export class Organization extends Document<Types.ObjectId> {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ required: true, type: mongoose.Types.ObjectId, ref: 'User' })
  superAdminId: mongoose.Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: String, required: false })
  planName?: string;

  @Prop({
    type: {
      branding: {
        logo: String,
        primaryColor: String,
        secondaryColor: String,
      },
    },
    default: {
      branding: {
        logo: '',
        primaryColor: '#000',
        secondaryColor: '#fff',
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
  };

  @Prop({
    type: {
      totalUsers: Number,
      totalStudents: Number,
      totalTeachers: Number,
      totalClasses: Number,
    },
    default: {
      totalUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      totalClasses: 0,
    },
    required: false,
  })
  stats?: {
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
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
    required: false,
  })
  verification?: {
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
   * Platform-admin (SUPER_ADMIN) account-approval gate. New orgs start PENDING
   * and cannot operate fully until approved.
   */
  @Prop({ type: String, enum: ApprovalStatus, default: ApprovalStatus.PENDING, index: true })
  approvalStatus: ApprovalStatus;

  @Prop({ type: String, default: null })
  approvalComment?: string | null;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'User', default: null })
  approvalReviewedBy?: mongoose.Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  approvalReviewedAt?: Date | null;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

OrganizationSchema.plugin(mongoosePaginate);

OrganizationSchema.virtual('superAdmin', {
  ref: 'User',
  localField: 'superAdminId',
  foreignField: '_id',
  justOne: true,
});

OrganizationSchema.set('toJSON', { virtuals: true });
OrganizationSchema.set('toObject', { virtuals: true });
