import { Equals, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, NotEquals, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '@islamic-academy/shared-types';

/**
 * Minimal org info needed when a Google-OAuth user picks the Organization role.
 * Intentionally lighter than CreateOrganizationDto: settings/branding are
 * auto-populated with defaults during onboarding.
 */
export class OnboardingOrganizationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
    message: 'Slug must start with a letter and contain only letters, numbers, and underscores',
  })
  slug: string;
}

/** Roles that can be self-assigned during onboarding — everything except GUEST and SUPER_ADMIN is org-managed. */
export class CompleteOnboardingDto {
  @IsNotEmpty()
  @IsEnum(Roles)
  @NotEquals(Roles.GUEST, { message: 'Cannot keep the GUEST role after onboarding' })
  roleName: Roles;

  @IsNotEmpty()
  @Matches(/^\+?\d{7,15}$/, { message: 'Phone must be 7-15 digits and may start with +' })
  phone: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  /** Required when the user chooses the Organization (SUPER_ADMIN) role. */
  @ValidateIf((o: CompleteOnboardingDto) => o.roleName === Roles.SUPER_ADMIN)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => OnboardingOrganizationDto)
  organizationDto?: OnboardingOrganizationDto;

  /** Rules & privacy acceptance — required (must be true) for the Organization role. */
  @ValidateIf((o: CompleteOnboardingDto) => o.roleName === Roles.SUPER_ADMIN)
  @IsBoolean()
  @Equals(true, { message: 'You must accept the terms and conditions' })
  acceptedTerms?: boolean;
}
