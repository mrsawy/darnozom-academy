import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/utils', () => ({ useQuery: vi.fn(), useMutation: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: vi.fn(() => (k: string) => k) }));
vi.mock('@/lib/utils/errors/translateApiMessage', () => ({ translateApiMessage: vi.fn() }));
vi.mock('@/lib/actions/dashboard/dashboard.action', () => ({
  getAdminDashboard: vi.fn(),
  getTeacherDashboard: vi.fn(),
  getParentDashboard: vi.fn(),
}));

import { dashboardKeys } from './use-dashboard.hook';

describe('dashboardKeys', () => {
  it('admin key is stable', () => {
    expect(dashboardKeys.admin()).toEqual(['dashboard', 'admin']);
  });

  it('teacher key is stable', () => {
    expect(dashboardKeys.teacher()).toEqual(['dashboard', 'teacher']);
  });

  it('parent key is stable', () => {
    expect(dashboardKeys.parent()).toEqual(['dashboard', 'parent']);
  });
});
