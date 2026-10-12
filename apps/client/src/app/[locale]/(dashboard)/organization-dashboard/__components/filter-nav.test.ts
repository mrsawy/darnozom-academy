import { describe, expect, it } from 'vitest';
import { Roles } from '@darnozom/shared-types';
import { isNavItemVisible } from './filter-nav';

describe('isNavItemVisible', () => {
  it('shows ungated items to everyone', () => {
    expect(isNavItemVisible({}, { roleName: Roles.STUDENT })).toBe(true);
  });
  it('requires one of requiredRoles, primary or additional', () => {
    const item = { requiredRoles: [Roles.COORDINATOR, Roles.MANAGER] };
    expect(isNavItemVisible(item, { roleName: Roles.MANAGER })).toBe(true);
    expect(isNavItemVisible(item, { roleName: Roles.INSTRUCTOR, additionalRoles: [Roles.COORDINATOR] })).toBe(true);
    expect(isNavItemVisible(item, { roleName: Roles.INSTRUCTOR })).toBe(false);
    expect(isNavItemVisible(item, undefined)).toBe(false);
  });
  it('treats instructorOnly as holding INSTRUCTOR in any position', () => {
    expect(isNavItemVisible({ instructorOnly: true }, { roleName: Roles.SUPERVISOR, additionalRoles: [Roles.INSTRUCTOR] })).toBe(true);
    expect(isNavItemVisible({ instructorOnly: true }, { roleName: Roles.SUPERVISOR })).toBe(false);
  });
});
