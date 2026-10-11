import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Roles } from '@darnozom/shared-types';
import { CompleteOnboardingDto } from './complete-onboarding.dto';

const roleErrors = (roleName: string) =>
  validateSync(plainToInstance(CompleteOnboardingDto, { roleName, phone: '+201234567890' })).filter((e) => e.property === 'roleName');

describe('CompleteOnboardingDto.roleName', () => {
  it('accepts only the self-assignable roles', () => {
    expect(roleErrors(Roles.STUDENT)).toHaveLength(0);
    expect(roleErrors(Roles.PARENT)).toHaveLength(0);
    expect(roleErrors(Roles.SUPER_ADMIN)).toHaveLength(0);
  });

  it('rejects every other role, including staff roles added later', () => {
    const selfAssignable: string[] = [Roles.STUDENT, Roles.PARENT, Roles.SUPER_ADMIN];
    for (const role of Object.values(Roles).filter((r) => !selfAssignable.includes(r))) {
      expect({ role, rejected: roleErrors(role).length > 0 }).toEqual({ role, rejected: true });
    }
  });
});
