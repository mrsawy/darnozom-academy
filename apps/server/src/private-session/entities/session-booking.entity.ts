import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Currency, MeetingProvider, PaymentMethod } from '@darnozom/shared-types';
import { BookingStatus } from '../enums/booking-status.enum';
import { RescheduleStatus } from '../enums/reschedule-status.enum';
import { RefundRequestStatus } from '../enums/refund-status.enum';

export interface IPaymentDetails {
  transactionId?: string;
  paidAmount: number;
  currency: Currency;
  paidAt: Date;
  /**
   * Amount actually credited to the revenue-holder wallet (net of plan tax). Recorded at
   * booking time so a refund can reverse exactly what was credited without recomputing
   * tax percentages that may have since changed — see design §7 "Refund wallet ownership
   * ambiguity" risk mitigation.
   */
  netAmount?: number;
}

export interface IRescheduleRequest {
  requestedBy: Types.ObjectId;
  requestedByRole: string;
  /** The real, future `PrivateSession.availableSlots` entry this request resolved to. */
  newSlotId: Types.ObjectId;
  /** Absolute UTC instants copied from the matched slot at request time. */
  newStartsAt: Date;
  newEndsAt: Date;
  newTimezone: string;
  reason: string;
  status: RescheduleStatus;
  respondedAt?: Date;
  rejectionReason?: string;
}

export interface IRefundRequest {
  requestedBy: Types.ObjectId;
  reason: string;
  status: RefundRequestStatus;
  respondedAt?: Date;
  rejectionReason?: string;
  /** Amount actually returned to the student's wallet, set on approval. */
  refundedAmount?: number;
  refundedCurrency?: Currency;
}

const PaymentDetailsSchema = new mongoose.Schema(
  {
    transactionId: { type: String },
    paidAmount: { type: Number, required: true },
    currency: { type: String, enum: Object.values(Currency), required: true },
    paidAt: { type: Date, required: true },
    netAmount: { type: Number },
  },
  { _id: false }
);

const RescheduleRequestSchema = new mongoose.Schema(
  {
    requestedBy: { type: Types.ObjectId, ref: 'User', required: true },
    requestedByRole: { type: String, required: true },
    newSlotId: { type: Types.ObjectId, required: true },
    newStartsAt: { type: Date, required: true },
    newEndsAt: { type: Date, required: true },
    newTimezone: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(RescheduleStatus),
      default: RescheduleStatus.PENDING,
    },
    respondedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { _id: false }
);

const RefundRequestSchema = new mongoose.Schema(
  {
    requestedBy: { type: Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(RefundRequestStatus),
      default: RefundRequestStatus.PENDING,
    },
    respondedAt: { type: Date },
    rejectionReason: { type: String },
    refundedAmount: { type: Number },
    refundedCurrency: { type: String, enum: Object.values(Currency) },
  },
  { _id: false }
);

@Schema({ timestamps: true, collection: 'session_bookings' })
export class SessionBooking extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'PrivateSession', required: true, index: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  parentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  instructorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  /** Absolute UTC start instant — source of truth for join window, ordering, lifecycle. */
  @Prop({ type: Date, required: true, index: true })
  startsAt: Date;

  /** Absolute UTC end instant. */
  @Prop({ type: Date, required: true })
  endsAt: Date;

  /** IANA timezone copied from the slot at booking time (for display). */
  @Prop({ type: String, required: true })
  timezone: string;

  /** @deprecated Legacy wall-clock fields kept during the instant migration. */
  @Prop({ type: Date })
  scheduledDate?: Date;

  /** @deprecated */
  @Prop({ type: String })
  startTime?: string;

  /** @deprecated */
  @Prop({ type: String })
  endTime?: string;

  @Prop({
    type: String,
    enum: Object.values(BookingStatus),
    default: BookingStatus.PENDING_PAYMENT,
    index: true,
  })
  status: BookingStatus;

  @Prop({ type: String, enum: Object.values(PaymentMethod) })
  paymentMethod: PaymentMethod;

  @Prop({ type: PaymentDetailsSchema })
  paymentDetails: IPaymentDetails;

  @Prop({ type: String, enum: Object.values(MeetingProvider), default: MeetingProvider.EXTERNAL_URL })
  provider: MeetingProvider;

  @Prop({ type: String })
  meetingLink?: string;

  /** Set when provider === AGORA. Format: `pvt-<bookingId>`. */
  @Prop({ type: String })
  agoraChannelName?: string;

  @Prop({ type: String })
  notes: string;

  @Prop({ type: String })
  cancellationReason: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelledBy: Types.ObjectId;

  @Prop({ type: Date })
  cancelledAt: Date;

  @Prop({ type: RescheduleRequestSchema })
  rescheduleRequest: IRescheduleRequest;

  @Prop({ type: RefundRequestSchema })
  refundRequest: IRefundRequest;
}

export const SessionBookingSchema = SchemaFactory.createForClass(SessionBooking);

SessionBookingSchema.index({ sessionId: 1, startsAt: 1, studentId: 1 }, { unique: true });

SessionBookingSchema.virtual('session', {
  ref: 'PrivateSession',
  localField: 'sessionId',
  foreignField: '_id',
  justOne: true,
});

SessionBookingSchema.virtual('student', {
  ref: 'User',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true,
});

SessionBookingSchema.virtual('parent', {
  ref: 'User',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true,
});

SessionBookingSchema.virtual('instructor', {
  ref: 'User',
  localField: 'instructorId',
  foreignField: '_id',
  justOne: true,
});

SessionBookingSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

SessionBookingSchema.set('toJSON', { virtuals: true });
SessionBookingSchema.set('toObject', { virtuals: true });

SessionBookingSchema.plugin(mongoosePaginate);
