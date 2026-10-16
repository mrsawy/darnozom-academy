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
    expect(
      isNavItemVisible(item, { roleName: Roles.INSTRUCTOR, additionalRoles: [Roles.COORDINATOR] })
    ).toBe(true);
    expect(isNavItemVisible(item, { roleName: Roles.INSTRUCTOR })).toBe(false);
    expect(isNavItemVisible(item)).toBe(false);
  });
  it('treats instructorOnly as holding INSTRUCTOR in any position', () => {
    expect(
      isNavItemVisible(
        { instructorOnly: true },
        { roleName: Roles.SUPERVISOR, additionalRoles: [Roles.INSTRUCTOR] }
      )
    ).toBe(true);
    expect(isNavItemVisible({ instructorOnly: true }, { roleName: Roles.SUPERVISOR })).toBe(false);
  });

  describe('instructor-only user', () => {
    const instructorUser = {
      roleName: Roles.INSTRUCTOR,
      additionalRoles: [] as string[],
    } as any;

    it('hides items with no instructorOnly flag when user is instructor-only', () => {
      const adminItem = { key: 'courses', titleKey: 'navMain.courses', url: '/org/courses' };
      expect(isNavItemVisible(adminItem, instructorUser)).toBe(false);
    });

    it('shows instructorOnly items for instructor-only user', () => {
      const teacherItem = { key: 'my-groups', titleKey: 'navMain.myGroups', url: '/org/my-groups', instructorOnly: true };
      expect(isNavItemVisible(teacherItem, instructorUser)).toBe(true);
    });

    it('shows all items for a user with INSTRUCTOR + COORDINATOR', () => {
      const dualUser = { roleName: Roles.INSTRUCTOR, additionalRoles: [Roles.COORDINATOR] } as any;
      const adminItem = { key: 'courses', titleKey: 'navMain.courses', url: '/org/courses' };
      expect(isNavItemVisible(adminItem, dualUser)).toBe(true);
    });
  });
});
