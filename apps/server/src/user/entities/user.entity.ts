import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Roles, UserStatus } from '@islamic-academy/shared-types';

export type UserDocument = User & Document<Types.ObjectId>;

@Schema({ timestamps: true })
export class User extends Document<Types.ObjectId> {
  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true })
  username: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ type: String, required: false })
  password?: string;

  @Prop({ type: String, required: false })
  googleId?: string;

  // Link to role by name instead of ID
  @Prop({ type: String, enum: Roles, required: true })
  roleName: Roles;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: false })
  organizationId?: Types.ObjectId;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ type: Boolean, default: true })
  onboardingComplete: boolean;

  @Prop({ type: String, enum: ['local', 'google'], required: false, default: 'local' })
  authProvider?: string;

  @Prop({ type: Date })
  lastLogin?: Date;

  @Prop({ type: String, required: false, default: null })
  activeSessionId?: string | null;

  @Prop({ type: String, required: false, default: null })
  activeRefreshTokenId?: string | null;

  /** The refresh-token id just superseded by a rotation; honored briefly via a grace window so concurrent refreshes don't log the user out. */
  @Prop({ type: String, required: false, default: null })
  previousRefreshTokenId?: string | null;

  /** When activeRefreshTokenId was last rotated — bounds the grace window for previousRefreshTokenId. */
  @Prop({ type: Date, required: false, default: null })
  refreshTokenRotatedAt?: Date | null;

  @Prop({ type: Date, required: false })
  activeSessionUpdatedAt?: Date;

  /** Soft-delete timestamp. When set, the user is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(mongoosePaginate);

// Unique only for active (non soft-deleted) users, so a deleted user does not block re-registration.
UserSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null }, name: 'username_unique_if_not_deleted' }
);
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deletedAt: null }, name: 'email_unique_if_not_deleted' });
UserSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' }, deletedAt: null }, name: 'phone_unique_if_set' }
);
UserSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' }, deletedAt: null }, name: 'googleId_unique_if_set' }
);

UserSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});
UserSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleName',
  foreignField: 'name',
  justOne: true,
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// Soft-delete-aware find middleware: excludes deleted users from standard queries
// unless the filter explicitly asks for a `deletedAt` value.
function applySoftDeleteFilter(this: mongoose.Query<unknown, unknown>) {
  const filter = this.getFilter() as Record<string, unknown>;
  if (!('deletedAt' in filter)) {
    this.where({ deletedAt: null });
  }
}
UserSchema.pre('find', applySoftDeleteFilter);
UserSchema.pre('findOne', applySoftDeleteFilter);
UserSchema.pre('countDocuments', applySoftDeleteFilter);
