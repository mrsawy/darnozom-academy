import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/utils/createNatsRequest', () => ({
  createAuthorizedNatsRequest: vi.fn(),
}));

import { getAdminDashboard, getTeacherDashboard, getParentDashboard } from './dashboard.action';
import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

const mockNats = vi.mocked(createAuthorizedNatsRequest);

describe('dashboard actions', () => {
  beforeEach(() => {
    mockNats.mockReset();
  });

  it('getAdminDashboard calls dashboard.admin', async () => {
    mockNats.mockResolvedValueOnce({ atRiskGroups: 2 } as any);
    const result = await getAdminDashboard();
    expect(mockNats).toHaveBeenCalledWith('dashboard.admin', {});
    expect(result).toEqual({ atRiskGroups: 2 });
  });

  it('getTeacherDashboard calls dashboard.teacher', async () => {
    mockNats.mockResolvedValueOnce({ sessions: [] } as any);
    await getTeacherDashboard();
    expect(mockNats).toHaveBeenCalledWith('dashboard.teacher', {});
  });

  it('getParentDashboard calls dashboard.parent', async () => {
    mockNats.mockResolvedValueOnce({ children: [] } as any);
    await getParentDashboard();
    expect(mockNats).toHaveBeenCalledWith('dashboard.parent', {});
  });
});
