import { BadRequestException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { assertStaffAssignable } from './group-staff';

const coordinator = { _id: new Types.ObjectId(), organizationId: new Types.ObjectId(), roleName: Roles.COORDINATOR, additionalRoles: [] };

describe('assertStaffAssignable', () => {
  it('accepts a user whose primary role matches', () => {
    expect(() => assertStaffAssignable(coordinator, Roles.COORDINATOR, AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION)).not.toThrow();
  });

  it('accepts a user who holds the role as an additional role', () => {
    const secretaryAlsoCoordinator = { ...coordinator, roleName: Roles.SECRETARY, additionalRoles: [Roles.COORDINATOR] };
    expect(() =>
      assertStaffAssignable(secretaryAlsoCoordinator, Roles.COORDINATOR, AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION)
    ).not.toThrow();
  });

  it('rejects a user who does not hold the role', () => {
    const teacher = { ...coordinator, roleName: Roles.INSTRUCTOR, additionalRoles: [] };
    expect(() => assertStaffAssignable(teacher, Roles.COORDINATOR, AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION)).toThrow(
      new BadRequestException(AcademicsErrors.COORDINATOR_NOT_FOUND_IN_ORGANIZATION)
    );
  });

  it('rejects a user who does not exist in the organization', () => {
    expect(() => assertStaffAssignable(null, Roles.SUPERVISOR, AcademicsErrors.SUPERVISOR_NOT_FOUND_IN_ORGANIZATION)).toThrow(
      new BadRequestException(AcademicsErrors.SUPERVISOR_NOT_FOUND_IN_ORGANIZATION)
    );
  });
});
