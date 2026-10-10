import { UserSchema } from '../../../src/user/entities/user.entity';

function findSingleFieldIndex(field: string) {
  return UserSchema.indexes().find(([fields]) => Object.keys(fields).length === 1 && fields[field] === 1);
}

describe('UserSchema identity unique indexes', () => {
  it('does not mark email or username unique on the path (full unique would block re-registration)', () => {
    expect(UserSchema.path('email')?.options?.unique).toBeFalsy();
    expect(UserSchema.path('username')?.options?.unique).toBeFalsy();
  });

  it.each([
    ['email', 'email_unique_if_not_deleted', { deletedAt: null }],
    ['username', 'username_unique_if_not_deleted', { deletedAt: null }],
    ['phone', 'phone_unique_if_set', { phone: { $type: 'string' }, deletedAt: null }],
    ['googleId', 'googleId_unique_if_set', { googleId: { $type: 'string' }, deletedAt: null }],
  ] as const)('enforces %s uniqueness only for active users', (field, name, partial) => {
    const found = findSingleFieldIndex(field);
    expect(found).toBeDefined();
    const [, options] = found!;
    expect(options.unique).toBe(true);
    expect(options.partialFilterExpression).toEqual(partial);
    expect(options.name).toBe(name);
  });
});
