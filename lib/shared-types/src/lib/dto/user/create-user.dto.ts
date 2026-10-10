import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  IsEnum,
  IsMongoId,
  Matches,
  IsArray,
  ValidateIf,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import mongoose from 'mongoose';
import { MustBeEmptyWhen } from '../custom/must-be-empty.validator';
import { Roles, UserStatus } from '../../types';
import { Currency } from '../../types/currency/currency.enum';

export class AddressDto {
  @IsOptional()
  @IsString()
  detailedAddress?: string; // override field when needed

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsNotEmpty()
  @IsString()
  country!: string;
}

export class SocialLinksDto {
  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  youtube?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  other?: string;
}

export class ProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  dateOfBirth?: Date;

  @IsOptional()
  @IsObject()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsObject()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}

export class PreferencesDto {
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;
}

export class CreateUserDto {
  @IsMongoId()
  @IsOptional()
  _id?: mongoose.Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  username!: string;

  // @IsOptional()
  // organization: object

  @IsMongoId()
  @IsOptional()
  walletId?: mongoose.Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  roleName!: Roles;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  /**
   * Required for local (non-Google) users.
   * @ValidateIf makes the field optional when authProvider === 'google'.
   * We intentionally omit @IsOptional so class-validator does enforce @IsNotEmpty
   * when the condition is true (i.e. local user submitted no phone).
   */
  @ValidateIf((o: CreateUserDto) => o.authProvider !== 'google')
  @IsNotEmpty({ message: 'Phone is required for local accounts' })
  @Matches(/^\+?\d+$/, {
    message: 'Phone must contain only digits and may start with +',
  })
  phone?: string;

  /**
   * Required for local (non-Google) users; OAuth users have no local password.
   */
  @ValidateIf((o: CreateUserDto) => o.authProvider !== 'google')
  @IsNotEmpty({ message: 'Password is required for local accounts' })
  @IsString()
  password?: string;

  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  lastName!: string;

  // @IsOptional()
  @IsObject()
  @Type(() => ProfileDto)
  profile?: ProfileDto;

  @IsOptional()
  @IsObject()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto;

  @IsEnum(Currency)
  preferredCurrency!: Currency;

  @IsOptional()
  authorization?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @ValidateIf((o: CreateUserDto) => o.roleName === Roles.STUDENT)
  @IsMongoId()
  @ValidateIf((o) => o.roleName !== Roles.STUDENT)
  @MustBeEmptyWhen((o) => (o as CreateUserDto).roleName !== Roles.STUDENT, { message: 'ParentUser is only allowed for students.' })
  parentUserId?: mongoose.Types.ObjectId;

  @IsOptional()
  @ValidateIf((o: CreateUserDto) => o.roleName === Roles.PARENT)
  @IsArray()
  @IsMongoId({ each: true })
  @ValidateIf((o) => o.roleName !== Roles.PARENT)
  @MustBeEmptyWhen((o) => (o as CreateUserDto).roleName !== Roles.PARENT, { message: 'childUsers is only allowed for parents.' })
  childUsersIds?: mongoose.Types.ObjectId[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @MustBeEmptyWhen((o) => (o as CreateUserDto).roleName !== Roles.INSTRUCTOR, { message: 'categoriesIds is only allowed for instructors.' })
  categoriesIds?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @MustBeEmptyWhen((o) => (o as CreateUserDto).roleName !== Roles.INSTRUCTOR, { message: 'gradesIds is only allowed for instructors.' })
  gradesIds?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @MustBeEmptyWhen((o) => (o as CreateUserDto).roleName !== Roles.INSTRUCTOR, { message: 'schoolTypesIds is only allowed for instructors.' })
  schoolTypesIds?: string[];

  @IsOptional()
  @IsDate()
  passwordLastUpdated?: Date | null;

  @IsOptional()
  @IsString()
  authProvider?: 'local' | 'google';

  @IsOptional()
  @IsString()
  googleId?: string;

  @IsOptional()
  onboardingComplete?: boolean;

  @IsOptional()
  @IsBoolean()
  organizationOnboarded?: boolean;

  @IsOptional()
  @IsBoolean()
  parentCreatedByStudent?: boolean;
}
