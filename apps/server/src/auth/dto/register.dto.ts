import { Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested, ValidateIf, IsOptional, IsBoolean, Equals } from 'class-validator';
import { CreateOrganizationDto } from '../../organization/dto/create-organization.dto';
import { Roles } from '@islamic-academy/shared-types';
import { CreateUserDto } from '@islamic-academy/shared-types/dto';

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

  /** Rules & privacy acceptance — required (must be true) for organization signups. Not persisted. */
  @ValidateIf(isOrganizationRegistration)
  @IsOptional()
  @IsBoolean()
  @Equals(true, { message: 'You must accept the terms and conditions' })
  acceptedTerms?: boolean;
}
