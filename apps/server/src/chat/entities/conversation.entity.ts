import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation extends Document {
  /** Sorted pair of user ObjectIds (ascending by hex string) — enforces 1-on-1 uniqueness. */
  @Prop({ type: [Types.ObjectId], ref: 'User', required: true, index: true })
  participantIds: Types.ObjectId[];

  @Prop({ type: String, default: '' })
  lastMessagePreview: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastMessageSenderId?: Types.ObjectId;

  @Prop({ type: Date })
  lastMessageAt?: Date;

  /** Per-participant unread counts keyed by userId string. */
  @Prop({ type: Map, of: Number, default: {} })
  unreadCount: Map<string, number>;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ participantIds: 1, lastMessageAt: -1 });
ConversationSchema.plugin(mongoosePaginate);
