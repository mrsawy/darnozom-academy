import { Test } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller.message';
import { DashboardService } from './dashboard.service';
import { IUserContext } from 'src/utils/types/IUserContext.interface';

describe('DashboardController', () => {
  let controller: DashboardController;
  const mockService = {
    getAdminCounts: jest.fn().mockResolvedValue({
      atRiskGroups: 0,
      openTasks: 0,
      overdueTasks: 0,
      groupsByStatus: {},
      todaySessions: {},
      contentAwaitingShariaReview: 0,
      receiptsAwaitingReview: 0,
      outstandingBalance: [],
      payStatementsAwaitingApproval: 0,
      certificatesAwaitingReview: 0,
    }),
    getTeacherDashboard: jest.fn().mockResolvedValue({ sessions: [] }),
    getParentDashboard: jest.fn().mockResolvedValue({ children: [] }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: mockService }],
    }).compile();
    controller = module.get(DashboardController);
  });

  it('getAdminDashboard delegates to service', async () => {
    const ctx = {
      userPayload: { _id: 'u1', organizationId: 'o1', roleName: 'OWNER', permissions: [] },
    } as unknown as IUserContext;
    const result = await controller.getAdminDashboard(ctx);
    expect(mockService.getAdminCounts).toHaveBeenCalledWith('u1', 'o1', []);
    expect(result.atRiskGroups).toBe(0);
  });

  it('getTeacherDashboard delegates to service', async () => {
    const ctx = {
      userPayload: { _id: 'u1', organizationId: 'o1', roleName: 'INSTRUCTOR' },
    } as unknown as IUserContext;
    const result = await controller.getTeacherDashboard(ctx);
    expect(mockService.getTeacherDashboard).toHaveBeenCalledWith('u1', 'o1');
    expect(result.sessions).toHaveLength(0);
  });

  it('getParentDashboard delegates to service', async () => {
    const ctx = {
      userPayload: { _id: 'u1', organizationId: 'o1', roleName: 'PARENT' },
    } as unknown as IUserContext;
    const result = await controller.getParentDashboard(ctx);
    expect(mockService.getParentDashboard).toHaveBeenCalledWith('u1', 'o1');
    expect(result.children).toHaveLength(0);
  });
});
