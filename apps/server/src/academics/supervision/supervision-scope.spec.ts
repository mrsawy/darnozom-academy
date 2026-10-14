import { Roles } from '@darnozom/shared-types';
import { resolveEvaluationScope } from './supervision-scope';

const actor = (roleName: Roles, additionalRoles: Roles[] = []) => ({ _id: 'u1', roleName, additionalRoles });

describe('resolveEvaluationScope', () => {
  it('gives supervisors, managers and owners the whole organization', () => {
    for (const role of [Roles.SUPERVISOR, Roles.MANAGER, Roles.OWNER]) {
      expect(resolveEvaluationScope(actor(role))).toEqual({ kind: 'ORG' });
    }
  });

  it('gives a teacher only the evaluations of their own sessions', () => {
    expect(resolveEvaluationScope(actor(Roles.INSTRUCTOR))).toEqual({ kind: 'OWN_TEACHING', teacherId: 'u1' });
  });

  it('gives a teacher who also supervises the organization scope, because they hold SUPERVISOR', () => {
    expect(resolveEvaluationScope(actor(Roles.INSTRUCTOR, [Roles.SUPERVISOR]))).toEqual({ kind: 'ORG' });
  });

  it('gives an accountant, a parent and a student nothing', () => {
    for (const role of [Roles.ACCOUNTANT, Roles.PARENT, Roles.STUDENT]) {
      expect(resolveEvaluationScope(actor(role))).toEqual({ kind: 'NONE' });
    }
  });

  it('gives a content officer and a Sharia reviewer nothing: these are pedagogical notes', () => {
    for (const role of [Roles.CONTENT_OFFICER, Roles.SHARIA_REVIEWER]) {
      expect(resolveEvaluationScope(actor(role))).toEqual({ kind: 'NONE' });
    }
  });
});
