import { describe, expect, it } from 'vitest';
import { Roles } from './roles.enum';
import { ADDITIONAL_ROLE_OPTIONS, getAdditionalRolesViolation, hasAnyRole, hasRole, ORG_WIDE_GROUP_READER_ROLES } from './role-helpers';

describe('hasRole', () => {
  it('matches the primary role', () => {
    expect(hasRole({ roleName: Roles.COORDINATOR }, Roles.COORDINATOR)).toBe(true);
  });
  it('matches an additional role', () => {
    expect(hasRole({ roleName: Roles.COORDINATOR, additionalRoles: [Roles.INSTRUCTOR] }, Roles.INSTRUCTOR)).toBe(true);
  });
  it('is false for a role the user does not hold', () => {
    expect(hasRole({ roleName: Roles.COORDINATOR, additionalRoles: [] }, Roles.ACCOUNTANT)).toBe(false);
  });
  it('is false for null/undefined users and null additionalRoles', () => {
    expect(hasRole(null, Roles.ADMIN)).toBe(false);
    expect(hasRole(undefined, Roles.ADMIN)).toBe(false);
    expect(hasRole({ roleName: Roles.ADMIN, additionalRoles: null }, Roles.INSTRUCTOR)).toBe(false);
  });
});

describe('hasAnyRole', () => {
  it('is true when one of the roles matches', () => {
    expect(hasAnyRole({ roleName: Roles.STUDENT }, [Roles.PARENT, Roles.STUDENT])).toBe(true);
  });
  it('is false when none match', () => {
    expect(hasAnyRole({ roleName: Roles.STUDENT }, ORG_WIDE_GROUP_READER_ROLES)).toBe(false);
  });
});

describe('getAdditionalRolesViolation', () => {
  it('accepts an empty list for any primary role', () => {
    expect(getAdditionalRolesViolation(Roles.STUDENT, [])).toBeNull();
  });
  it('accepts staff roles plus INSTRUCTOR on a staff primary role', () => {
    expect(getAdditionalRolesViolation(Roles.COORDINATOR, [Roles.INSTRUCTOR, Roles.SUPERVISOR])).toBeNull();
  });
  it('rejects any additional role for STUDENT and PARENT', () => {
    expect(getAdditionalRolesViolation(Roles.STUDENT, [Roles.INSTRUCTOR])).toBe('NOT_ALLOWED_FOR_PRIMARY_ROLE');
    expect(getAdditionalRolesViolation(Roles.PARENT, [Roles.ACCOUNTANT])).toBe('NOT_ALLOWED_FOR_PRIMARY_ROLE');
  });
  it('rejects duplicates', () => {
    expect(getAdditionalRolesViolation(Roles.ADMIN, [Roles.HR, Roles.HR])).toBe('DUPLICATE_ROLE');
  });
  it('rejects repeating the primary role', () => {
    expect(getAdditionalRolesViolation(Roles.MANAGER, [Roles.MANAGER])).toBe('PRIMARY_ROLE_REPEATED');
  });
  it('rejects roles outside ADDITIONAL_ROLE_OPTIONS', () => {
    expect(getAdditionalRolesViolation(Roles.MANAGER, [Roles.PLATFORM_ADMIN])).toBe('ROLE_NOT_ALLOWED');
    expect(getAdditionalRolesViolation(Roles.MANAGER, ['NOT_A_ROLE'])).toBe('ROLE_NOT_ALLOWED');
  });
  it('lists exactly the 8 staff roles plus INSTRUCTOR as options', () => {
    expect([...ADDITIONAL_ROLE_OPTIONS].sort()).toEqual(
      [Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR, Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER, Roles.HR, Roles.ACCOUNTANT, Roles.INSTRUCTOR].sort()
    );
  });
});
