import { Actions, Subjects } from '@darnozom/shared-types';
import { CaslAbilityFactory } from './permissions.factory';

type AnyUser = Parameters<CaslAbilityFactory['createForUser']>[0];

function user(partial: Record<string, unknown>): AnyUser {
  return { _id: 'u1', organizationId: 'o1', ...partial } as unknown as AnyUser;
}

describe('CaslAbilityFactory (multi-role)', () => {
  const factory = new CaslAbilityFactory();

  it('grants permissions from the primary role only when there are no additional roles', () => {
    const ability = factory.createForUser(user({ role: { permissions: [{ action: Actions.READ, subject: Subjects.GROUP }] } }));
    expect(ability.can(Actions.READ, Subjects.GROUP)).toBe(true);
    expect(ability.can(Actions.UPDATE, Subjects.TEACHER_AVAILABILITY)).toBe(false);
  });

  it('grants the union of primary and additional role permissions', () => {
    const ability = factory.createForUser(
      user({
        role: { permissions: [{ action: Actions.MANAGE, subject: Subjects.GROUP }] },
        additionalRoleDocs: [{ permissions: [{ action: Actions.MANAGE, subject: Subjects.TEACHER_AVAILABILITY }] }],
      })
    );
    expect(ability.can(Actions.UPDATE, Subjects.GROUP)).toBe(true);
    expect(ability.can(Actions.UPDATE, Subjects.TEACHER_AVAILABILITY)).toBe(true);
  });

  it('ignores missing additional role documents', () => {
    const ability = factory.createForUser(
      user({
        role: { permissions: [{ action: Actions.READ, subject: Subjects.GROUP }] },
        additionalRoleDocs: [null, { permissions: undefined }, { permissions: [{ action: Actions.READ, subject: Subjects.COHORT }] }],
      })
    );
    expect(ability.can(Actions.READ, Subjects.GROUP)).toBe(true);
    expect(ability.can(Actions.READ, Subjects.COHORT)).toBe(true);
  });
});
