import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Currency, EntityStatus, MeetingProvider } from '@lms-organization/shared-types';
import { SessionType } from '../enums/session-type.enum';
import { applySoftDeleteMiddleware } from 'src/utils/soft-delete';

const timeSlotValidator = {
  validator: (time: string) => /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(am|pm)$/i.test(time),
  message: 'Time must be in format HH:MM am/pm (e.g., 02:00 pm, 11:30 am)',
};

export interface ISessionPricing {
  price: number;
  currency: Currency;
  priceUSD?: number;
}

export interface IAvailableSlot {
  _id?: Types.ObjectId;
  /** Absolute UTC start instant — the source of truth for all time logic. */
  startsAt: Date;
  /** Absolute UTC end instant. */
  endsAt: Date;
  /** IANA timezone the slot was authored in, e.g. "Africa/Cairo". */
  timezone: string;
  /** @deprecated Legacy wall-clock fields kept during the instant migration. Derived from startsAt/endsAt. */
  date?: Date;
  /** @deprecated */
  startTime?: string;
  /** @deprecated */
  endTime?: string;
  /** Determines how participants join this slot. Defaults to EXTERNAL_URL. */
  provider: MeetingProvider;
  /** Required when provider === EXTERNAL_URL. */
  meetingUrl?: string;
  maxBookings: number;
}

const SessionPricingSchema = new mongoose.Schema(
  {
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: Object.values(Currency), required: true },
    priceUSD: { type: Number },
  },
  { _id: false }
);

const AvailableSlotSchema = new mongoose.Schema(
  {
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    timezone: { type: String, required: true },
    // Legacy wall-clock fields — retained (optional) during the instant migration.
    date: { type: Date },
    startTime: { type: String, validate: timeSlotValidator },
    endTime: { type: String, validate: timeSlotValidator },
    provider: {
      type: String,
      enum: Object.values(MeetingProvider),
      default: MeetingProvider.EXTERNAL_URL,
    },
    meetingUrl: { type: String },
    maxBookings: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: true }
);

@Schema({ timestamps: true, collection: 'private_sessions' })
export class PrivateSession extends Document<Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  instructorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: Number, required: true, min: 15 })
  duration: number;

  @Prop({ type: SessionPricingSchema, required: true })
  pricing: ISessionPricing;

  @Prop({ type: [AvailableSlotSchema], default: [] })
  availableSlots: IAvailableSlot[];

  @Prop({ type: String })
  location: string;

  @Prop({ type: String, enum: Object.values(SessionType), required: true })
  sessionType: SessionType;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String, enum: Object.values(EntityStatus), default: EntityStatus.ACTIVE, index: true })
  status: EntityStatus;

  @Prop({ type: String })
  thumbnailKey: string;

  /** Soft-delete timestamp. When set, the private session is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this private session. */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const PrivateSessionSchema = SchemaFactory.createForClass(PrivateSession);

PrivateSessionSchema.virtual('instructor', {
  ref: 'User',
  localField: 'instructorId',
  foreignField: '_id',
  justOne: true,
});

PrivateSessionSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});

PrivateSessionSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

PrivateSessionSchema.set('toJSON', { virtuals: true });
PrivateSessionSchema.set('toObject', { virtuals: true });

PrivateSessionSchema.plugin(mongoosePaginate);
applySoftDeleteMiddleware(PrivateSessionSchema);
