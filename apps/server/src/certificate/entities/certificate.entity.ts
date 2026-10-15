import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  CertificateStatus,
  ICertificateEligibility,
} from '@darnozom/shared-types';

@Schema({ timestamps: true })
export class Certificate extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Group', required: true, index: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Level', required: true, index: true })
  levelId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true, index: true })
  courseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(CertificateStatus),
    default: CertificateStatus.NAME_REVIEW,
    index: true,
  })
  status: CertificateStatus;

  @Prop({
    type: {
      attendancePercent: { type: Number, required: true },
      homeworkAverage: { type: Number, required: true },
      examPassed: { type: Boolean, required: false },
      fullyPaid: { type: Boolean, required: false },
      rulesSnapshot: { type: Object, required: true },
      isEligible: { type: Boolean, required: true },
      failedRules: { type: [String], required: false },
    },
    required: true,
    _id: false,
  })
  eligibility: ICertificateEligibility;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  nameAr: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  nameEn: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  nameConfirmedBy?: Types.ObjectId | null;

  @Prop({ type: Date, required: false, default: null })
  nameConfirmedAt?: Date | null;

  @Prop({ type: String, required: false, sparse: true, index: true })
  serial?: string;

  @Prop({ type: String, required: false, sparse: true, index: true })
  verificationToken?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  issuedBy?: Types.ObjectId | null;

  @Prop({ type: Date, required: false, default: null })
  issuedAt?: Date | null;

  @Prop({ type: String, required: false, default: null })
  qrCodeDataUrl?: string | null;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);
CertificateSchema.index({ groupId: 1, studentId: 1 }, { unique: true });
CertificateSchema.index({ organizationId: 1, status: 1 });
