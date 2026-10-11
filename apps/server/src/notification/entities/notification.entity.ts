import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { NotificationType } from '@darnozom/shared-types';

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  /** Translation key under the client's `Notifications` i18n namespace — never final text. */
  @Prop({ type: String, required: true })
  titleKey: string;

  /** Translation key under the client's `Notifications` i18n namespace, if the notification has a body. */
  @Prop({ type: String, required: false })
  bodyKey?: string;

  /** Interpolation values for `titleKey`/`bodyKey` (e.g. `{ courseName: '...' }`). */
  @Prop({ type: Object, required: false })
  params?: Record<string, string>;

  /** Extra payload the client uses to route a click (e.g. `{ courseId, contentId }`). Not translated. */
  @Prop({ type: Object, required: false })
  data?: Record<string, string>;

  @Prop({ type: Boolean, default: false })
  read: boolean;

  @Prop({ type: String, enum: NotificationType, default: NotificationType.INFO })
  type: NotificationType;

  @Prop({ type: Types.ObjectId, refPath: 'relatedModel', required: false })
  relatedId: Types.ObjectId;

  @Prop({ type: String, enum: ['Course', 'Enrollment', 'CourseContent', 'PrivateSession', 'SessionBooking'], required: false })
  relatedModel: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.plugin(mongoosePaginate);
