import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Roles, UserErrors, UserStatus, Currency } from '@darnozom/shared-types';
import { applyUserSoftDeleteMiddleware } from '../utils/user-soft-delete.middleware';

export type UserDocument = User & Document<Types.ObjectId>;

/** TypeScript types for embedded documents (used for typing only; schemas are plain Mongoose schemas below) */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}
export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
  other?: string;
}
export interface Profile {
  bio?: string;
  shortBio?: string;
  avatar?: string;
  dateOfBirth?: Date;
  address?: Address;
  socialLinks?: SocialLinks;
}
export interface Preferences {
  language?: string;
  emailNotifications?: boolean;
  darkMode?: boolean;
}

const AddressSchema = new mongoose.Schema({ street: String, city: String, state: String, zipCode: String, country: String }, { _id: false });
const SocialLinksSchema = new mongoose.Schema(
  {
    linkedin: String,
    twitter: String,
    instagram: String,
    facebook: String,
    youtube: String,
    tiktok: String,
    website: String,
    other: String,
  },
  { _id: false }
);
const ProfileSchema = new mongoose.Schema(
  {
    bio: String,
    shortBio: String,
    avatar: String,
    dateOfBirth: Date,
    address: AddressSchema,
    socialLinks: SocialLinksSchema,
  },
  { _id: false }
);
const PreferencesSchema = new mongoose.Schema({ language: String, emailNotifications: Boolean, darkMode: Boolean }, { _id: false });

/**
 * Creates a validator configuration for instructor-only number fields
 * @param fieldName - The name of the field for error messages
 * @returns Mongoose validator configuration object
 */
function createInstructorOnlyNumberValidator(fieldName: string) {
  return {
    validator: function (this: User, value: number) {
      // If value is 0 or undefined, it's valid
      if (value === 0 || value === undefined || value === null) {
        return true;
      }
      // If value is provided and non-zero, roleName must be INSTRUCTOR
      const roleName = this.roleName;
      return roleName !== undefined && String(roleName).toLowerCase() === Roles.INSTRUCTOR.toLowerCase();
    },
    message: `${fieldName} is only acceptable for INSTRUCTOR role`,
  };
}

@Schema({ timestamps: true })
export class User extends Document<mongoose.Types.ObjectId> {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: false })
  organizationId?: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true, // Optional: store usernames in lowercase
  })
  username: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ type: String, required: false })
  password?: string;

  @Prop({ type: String, required: false })
  googleId?: string;

  @Prop({ type: Boolean, default: true })
  onboardingComplete: boolean;

  /** False until SuperAdmin finishes/skips the org dashboard product tour. */
  @Prop({ type: Boolean, required: false })
  organizationOnboarded?: boolean;

  @Prop({ type: String, enum: ['local', 'google'], required: false })
  authProvider?: string;

  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  // 👇 Link to role by name instead of ID
  @Prop({ type: String, enum: Roles, required: true })
  roleName: Roles;

  /** Extra roles held in addition to the primary `roleName` (staff roles + INSTRUCTOR only). */
  @Prop({ type: [{ type: String, enum: Object.values(Roles) }], default: [] })
  additionalRoles: Roles[];

  @Prop({ type: ProfileSchema, required: false })
  profile: Profile;

  @Prop({ type: PreferencesSchema })
  preferences: Preferences;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: string;

  @Prop({ type: Date })
  lastLogin: Date;

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

  @Prop({ type: mongoose.Types.ObjectId })
  walletId: mongoose.Types.ObjectId;

  @Prop({ type: String, enum: Currency, required: true })
  preferredCurrency: string;

  @Prop({
    type: Number,
    required: false,
    validate: createInstructorOnlyNumberValidator('averageRating'),
  })
  averageRating?: number;

  @Prop({
    type: Number,
    required: false,
    validate: createInstructorOnlyNumberValidator('totalReviews'),
  })
  totalReviews?: number;

  @Prop({
    type: Number,
    required: false,
    validate: createInstructorOnlyNumberValidator('averageCoursesRating'),
  })
  averageCoursesRating?: number;

  @Prop({
    type: Number,
    required: false,
    validate: createInstructorOnlyNumberValidator('totalCoursesReviews'),
  })
  totalCoursesReviews?: number;

  @Prop({
    type: Number,
    required: false,
    validate: createInstructorOnlyNumberValidator('totalStudents'),
  })
  totalStudents?: number;

  @Prop({
    type: Number,
    required: false,
    validate: createInstructorOnlyNumberValidator('totalCourses'),
  })
  totalCourses?: number;

  @Prop({
    type: [mongoose.Types.ObjectId],
    ref: 'Category',
    default: [],
    validate: {
      validator: function (this: User, value: Types.ObjectId[]) {
        // If categoriesIds is empty or undefined, it's valid
        if (!value || value.length === 0) {
          return true;
        }
        // If categoriesIds is provided, roleName must be INSTRUCTOR
        const roleName = this.roleName;
        return roleName !== undefined && String(roleName).toLowerCase() === Roles.INSTRUCTOR.toLowerCase();
      },
      message: 'categoriesIds is only acceptable for INSTRUCTOR role',
    },
  })
  categoriesIds: Types.ObjectId[];

  @Prop({
    type: [mongoose.Types.ObjectId],
    ref: 'Grade',
    default: [],
    validate: {
      validator: function (this: User, value: Types.ObjectId[]) {
        // If gradesIds is empty or undefined, it's valid
        if (!value || value.length === 0) {
          return true;
        }
        // If gradesIds is provided, roleName must be INSTRUCTOR
        const roleName = this.roleName;
        return roleName !== undefined && String(roleName).toLowerCase() === Roles.INSTRUCTOR.toLowerCase();
      },
      message: 'gradesIds is only acceptable for INSTRUCTOR role',
    },
  })
  gradesIds: Types.ObjectId[];

  @Prop({
    type: [mongoose.Types.ObjectId],
    ref: 'SchoolType',
    default: [],
    validate: {
      validator: function (this: User, value: Types.ObjectId[]) {
        // If schoolTypesIds is empty or undefined, it's valid
        if (!value || value.length === 0) {
          return true;
        }
        // If schoolTypesIds is provided, roleName must be INSTRUCTOR
        const roleName = this.roleName;
        return roleName !== undefined && String(roleName).toLowerCase() === Roles.INSTRUCTOR.toLowerCase();
      },
      message: 'schoolTypesIds is only acceptable for INSTRUCTOR role',
    },
  })
  schoolTypesIds: Types.ObjectId[];

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
    validate: {
      validator: function (this: User) {
        return this.roleName !== undefined && this.roleName === Roles.STUDENT;
      },
      message: 'ParentUser is only acceptable for STUDENT role',
    },
  })
  parentUserId?: Types.ObjectId;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: false,
    default: undefined,
  })
  childUsersIds?: Types.ObjectId[];

  /** True when a linked student created this parent account (self-service), vs registration auto-parent. */
  @Prop({ type: Boolean, required: false })
  parentCreatedByStudent?: boolean;

  @Prop({ type: Date, required: false, default: null })
  passwordLastUpdated?: Date | null;

  /** Soft-delete timestamp. When set, the user is considered deleted. */
  @Prop({ type: Date, required: false, default: null, index: true })
  deletedAt?: Date | null;

  /** User who soft-deleted this account (platform admin or org admin). */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  deletedById?: Types.ObjectId | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.plugin(mongoosePaginate);
applyUserSoftDeleteMiddleware(UserSchema);

// Partial unique indexes: uniqueness enforced only when the field is an actual string.
// A sparse or unique index still indexes `null`, so a second user with no phone would
// hit E11000. Partial indexes with { $type: 'string' } skip documents where the field
// is absent or null — the correct approach for optional-but-unique fields.
UserSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phone: { $type: 'string' }, deletedAt: null },
    name: 'phone_unique_if_set',
  }
);
UserSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleId: { $type: 'string' }, deletedAt: null },
    name: 'googleId_unique_if_set',
  }
);

// Unique only for active users so soft-deleted rows do not block re-registration.
// Existing DBs must drop the old unique indexes (`username_1`, `email_1`) first.
// Re-run migrate:user-unique-if-not-deleted to also refresh phone/googleId partials.
UserSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'username_unique_if_not_deleted',
  }
);
UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: 'email_unique_if_not_deleted',
  }
);

// Compound index for featured instructors query performance
UserSchema.index(
  {
    roleName: 1,
    totalCourses: 1,
    totalCoursesReviews: -1,
  },
  {
    name: 'featured_instructors_idx',
    background: true,
  }
);

// Pre-save hook to reset instructor-only fields if user is not an instructor
UserSchema.pre('save', function (next) {
  const isInstructor = this.roleName === Roles.INSTRUCTOR;
  const isStudent = this.roleName === Roles.STUDENT;
  const isParent = this.roleName === Roles.PARENT;

  // If not an instructor, set all instructor-only fields to undefined
  if (!isInstructor) {
    this.averageRating = undefined;
    this.totalReviews = undefined;
    this.averageCoursesRating = undefined;
    this.totalCoursesReviews = undefined;
    this.totalStudents = undefined;
    this.totalCourses = undefined;
    this.gradesIds = [];
    this.schoolTypesIds = [];
  }

  if (!isStudent) {
    this.parentUserId = undefined;
  }

  if (!isParent) {
    this.childUsersIds = undefined;
    this.parentCreatedByStudent = undefined;
  }

  next();
});

UserSchema.pre('validate', function (next) {
  if (this.onboardingComplete !== false) {
    // Google OAuth users may complete onboarding (e.g. via course purchase) without a phone number.
    if (!this.phone && this.authProvider !== 'google') {
      this.invalidate('phone', UserErrors.PHONE_REQUIRED_FOR_NON_OAUTH);
    }
    // OAuth users (Google) do not have a local password — skip the password check for them.
    if (!this.password && this.authProvider !== 'google') {
      this.invalidate('password', UserErrors.PASSWORD_REQUIRED_FOR_NON_OAUTH);
    }
  }
  next();
});

UserSchema.virtual('organization', {
  ref: 'Organization',
  localField: 'organizationId',
  foreignField: '_id',
  justOne: true,
});
UserSchema.virtual('wallet', {
  ref: 'Wallet',
  localField: 'walletId',
  foreignField: '_id',
  justOne: true,
});
UserSchema.virtual('role', {
  ref: 'Role',
  localField: 'roleName',
  foreignField: 'name',
  justOne: true,
});
UserSchema.virtual('additionalRoleDocs', {
  ref: 'Role',
  localField: 'additionalRoles',
  foreignField: 'name',
  justOne: false,
});
UserSchema.virtual('categories', {
  ref: 'Category',
  localField: 'categoriesIds',
  foreignField: '_id',
  justOne: false,
});
UserSchema.virtual('grades', {
  ref: 'Grade',
  localField: 'gradesIds',
  foreignField: '_id',
  justOne: false,
});
UserSchema.virtual('schoolTypes', {
  ref: 'SchoolType',
  localField: 'schoolTypesIds',
  foreignField: '_id',
  justOne: false,
});
UserSchema.virtual('childUsers', {
  ref: 'User',
  localField: 'childUsersIds',
  foreignField: '_id',
  justOne: false,
});
UserSchema.virtual('parentUser', {
  ref: 'User',
  localField: 'parentUserId',
  foreignField: '_id',
  justOne: true,
});
UserSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedById',
  foreignField: '_id',
  justOne: true,
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });
