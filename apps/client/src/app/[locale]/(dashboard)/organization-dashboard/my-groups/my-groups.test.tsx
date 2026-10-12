import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Roles } from '@darnozom/shared-types';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';
import MyGroupsPage from './page';

vi.mock('next-intl', () => ({
  // eslint-disable-next-line unicorn/consistent-function-scoping -- vi.mock factories are hoisted and cannot reference outer-scope helpers
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
vi.mock('@/lib/hooks/user/use-user.hook', () => ({
  useAuthUser: () => ({
    data: { _id: 'teacher-1', roleName: Roles.COORDINATOR, additionalRoles: [Roles.INSTRUCTOR] },
  }),
}));
vi.mock('@/lib/hooks/academics/use-academics.hook', () => ({
  useGroups: vi.fn(() => ({ data: [], isLoading: false })),
}));

describe('MyGroupsPage', () => {
  it('lists only the groups the signed-in user teaches, even with an org-wide role', () => {
    render(<MyGroupsPage />);
    expect(vi.mocked(useGroups)).toHaveBeenCalledWith({ teacherId: 'teacher-1' });
    expect(vi.mocked(useGroups)).not.toHaveBeenCalledWith({});
  });
});
