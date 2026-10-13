import { BadRequestException } from '@nestjs/common';
import { AcademicsErrors, hasRole, Roles } from '@darnozom/shared-types';

interface StaffCandidate {
  roleName: Roles;
  additionalRoles?: readonly Roles[];
}

/**
 * A coordinator or supervisor must exist in the organization and hold the role, either as their
 * primary role or as an additional one — a staff member may hold more than one (MVP §2).
 */
export function assertStaffAssignable(user: StaffCandidate | null, role: Roles, error: AcademicsErrors): void {
  if (!user) throw new BadRequestException(error);
  if (!hasRole({ roleName: user.roleName, additionalRoles: user.additionalRoles ?? [] }, role)) {
    throw new BadRequestException(error);
  }
}
