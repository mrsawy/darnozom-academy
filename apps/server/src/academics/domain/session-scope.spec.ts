import { Roles } from '@darnozom/shared-types';
import { resolveSessionScope } from './session-scope';

const actor = (roleName: Roles, additionalRoles: Roles[] = []) => ({ _id: 'u1', roleName, additionalRoles });

describe('resolveSessionScope', () => {
  it('treats pedagogical org-wide staff as STAFF', () => {
    for (const role of [Roles.ADMIN, Roles.OWNER, Roles.MANAGER, Roles.COORDINATOR, Roles.SUPERVISOR]) {
      expect(resolveSessionScope(actor(role))).toEqual({ kind: 'ORG', audience: 'STAFF' });
    }
  });
  it('limits an accountant to the ACCOUNTANT audience unless they also hold a pedagogical role', () => {
    expect(resolveSessionScope(actor(Roles.ACCOUNTANT))).toEqual({ kind: 'ORG', audience: 'ACCOUNTANT' });
    expect(resolveSessionScope(actor(Roles.ACCOUNTANT, [Roles.COORDINATOR]))).toEqual({ kind: 'ORG', audience: 'STAFF' });
  });
  it('falls back to the group scopes for teachers, parents and students', () => {
    expect(resolveSessionScope(actor(Roles.INSTRUCTOR))).toEqual({ kind: 'TEACHER', teacherId: 'u1' });
    expect(resolveSessionScope(actor(Roles.PARENT))).toEqual({ kind: 'PARENT', parentId: 'u1' });
    expect(resolveSessionScope(actor(Roles.STUDENT))).toEqual({ kind: 'STUDENT', studentId: 'u1' });
    expect(resolveSessionScope(actor(Roles.HR))).toEqual({ kind: 'NONE' });
  });
});
