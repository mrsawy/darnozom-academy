import { Roles } from '@darnozom/shared-types';
import { resolveGroupScope } from './group-scope';

describe('resolveGroupScope', () => {
  it('gives org-wide scope to staff readers', () => {
    for (const roleName of [Roles.ADMIN, Roles.SUPER_ADMIN, Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR, Roles.ACCOUNTANT]) {
      expect(resolveGroupScope({ _id: 'u', roleName })).toEqual({ kind: 'ORG' });
    }
  });
  it('prefers org-wide scope when a teacher also holds a staff role', () => {
    expect(resolveGroupScope({ _id: 'u', roleName: Roles.INSTRUCTOR, additionalRoles: [Roles.SUPERVISOR] })).toEqual({ kind: 'ORG' });
  });
  it('limits teachers, parents and students to their own groups', () => {
    expect(resolveGroupScope({ _id: 't', roleName: Roles.INSTRUCTOR })).toEqual({ kind: 'TEACHER', teacherId: 't' });
    expect(resolveGroupScope({ _id: 'p', roleName: Roles.PARENT })).toEqual({ kind: 'PARENT', parentId: 'p' });
    expect(resolveGroupScope({ _id: 's', roleName: Roles.STUDENT })).toEqual({ kind: 'STUDENT', studentId: 's' });
  });
  it('gives no scope to roles without group access', () => {
    expect(resolveGroupScope({ _id: 'u', roleName: Roles.CONTENT_OFFICER })).toEqual({ kind: 'NONE' });
  });
});
