import { Equals, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, NotEquals, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthErrors, Currency, IDENTIFIER_PATTERN, Roles } from '@lms-organization/shared-types';

/**
 * Minimal org info needed when a Google-OAuth user picks the Organisation role.
 * Intentionally lighter than CreateOrganizationDto: settings/branding are
 * auto-populated with defaults during onboarding.
 */
export class OnboardingOrganizationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(IDENTIFIER_PATTERN, {
    message: 'Slug must start with a letter and contain only letters, numbers, and underscores',
  })
  slug: string;
}

/**
 * Roles that can be self-assigned during onboarding.
 * Users see: Student | Parent | Organisation (Teacher) → stored as SUPER_ADMIN.
 */
const ONBOARDING_SELF_ASSIGNABLE_ROLES = [Roles.STUDENT, Roles.PARENT, Roles.SUPER_ADMIN];

export class CompleteOnboardingDto {
  @IsNotEmpty()
  @IsEnum(Roles, {
    message: `roleName must be one of: ${ONBOARDING_SELF_ASSIGNABLE_ROLES.join(', ')}`,
  })
  @NotEquals(Roles.GUEST, { message: 'Cannot keep the GUEST role after onboarding' })
  @NotEquals(Roles.PLATFORM_ADMIN, { message: 'Cannot self-assign PLATFORM_ADMIN role' })
  @NotEquals(Roles.ADMIN, { message: 'Cannot self-assign ADMIN role' })
  @NotEquals(Roles.INSTRUCTOR, { message: 'Cannot self-assign INSTRUCTOR role' })
  @NotEquals(Roles.SECRETARY, { message: 'Cannot self-assign SECRETARY role' })
  roleName: Roles;

  @IsNotEmpty()
  @Matches(/^\+?\d{7,15}$/, { message: 'Phone must be 7–15 digits and may start with +' })
  phone: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  /** Defaults (client-side) from the visitor's IP country; omitted keeps the account default. */
  @IsOptional()
  @IsEnum(Currency)
  preferredCurrency?: Currency;

  /** Required when the user chooses the Organisation (SUPER_ADMIN) role. */
  @ValidateIf((o: CompleteOnboardingDto) => o.roleName === Roles.SUPER_ADMIN)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => OnboardingOrganizationDto)
  organizationDto?: OnboardingOrganizationDto;

  /** Rules & privacy acceptance — required (must be true) for the Organisation role. */
  @ValidateIf((o: CompleteOnboardingDto) => o.roleName === Roles.SUPER_ADMIN)
  @IsBoolean()
  @Equals(true, { message: AuthErrors.TERMS_NOT_ACCEPTED })
  acceptedTerms?: boolean;
}
