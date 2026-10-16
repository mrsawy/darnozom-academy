import { describe, expect, it } from 'vitest';
import {
  IAdminDashboardCounts,
  IParentDashboardData,
  ITeacherDashboardData,
  IParentChildCard,
} from './dashboard.types';
import { DashboardErrors } from '../../messages/dashboard-errors.enum';

describe('dashboard shared types', () => {
  it('IAdminDashboardCounts has all 9 count card fields', () => {
    const counts: IAdminDashboardCounts = {
      groupsByStatus: { FORMING: 0, READY_TO_START: 0, RUNNING: 0, COMPLETED: 0, CANCELLED: 0 },
      atRiskGroups: 0,
      todaySessions: { SCHEDULED: 0, REPORT_PENDING: 0, COMPLETED: 0 },
      openTasks: 0,
      overdueTasks: 0,
      contentAwaitingShariaReview: 0,
      receiptsAwaitingReview: 0,
      outstandingBalance: [],
      payStatementsAwaitingApproval: 0,
      certificatesAwaitingReview: 0,
    };
    expect(counts.atRiskGroups).toBe(0);
  });

  it('IParentChildCard has groupCards and actionItems', () => {
    const card: IParentChildCard = {
      studentId: 'sid',
      studentName: 'Ali',
      groupCards: [],
      latestEvaluation: null,
      actionItems: [],
    };
    expect(card.groupCards).toHaveLength(0);
  });

  it('DashboardErrors has FORBIDDEN', () => {
    expect(DashboardErrors.FORBIDDEN).toBeDefined();
  });
});
