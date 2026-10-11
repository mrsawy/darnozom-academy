import { Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested, ValidateIf, IsOptional, IsArray, IsMongoId, IsBoolean, Equals } from 'class-validator';
import { CreateOrganizationDto } from '../../organization/dto/create-organization.dto';
import { AuthErrors, Roles } from '@darnozom/shared-types';
import { CreateUserDto } from '@darnozom/shared-types/dto';

/** True only for organization (SUPER_ADMIN) registrations — not students/parents. */
function isOrganizationRegistration(o: RegisterDto): boolean {
  return o.userDto?.roleName !== Roles.STUDENT && o.userDto?.roleName !== Roles.PARENT;
}

export class RegisterDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CreateUserDto)
  userDto: CreateUserDto;

  @ValidateIf(isOrganizationRegistration)
  @ValidateNested()
  @IsNotEmpty()
  @Type(() => CreateOrganizationDto)
  organizationDto?: CreateOrganizationDto;

  /**
   * Rules & privacy acceptance — required (must be true) for organization
   * signups. Enforced here, not persisted.
   */
  @ValidateIf(isOrganizationRegistration)
  @IsBoolean()
  @Equals(true, { message: AuthErrors.TERMS_NOT_ACCEPTED })
  acceptedTerms?: boolean;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  wishlistCourseIds?: string[];
}
