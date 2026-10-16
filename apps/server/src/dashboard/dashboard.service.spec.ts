import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { Group } from '../academics/group/entities/group.entity';
import { Session } from '../academics/session/entities/session.entity';
import { Task } from '../academics/task/entities/task.entity';
import { CourseContent } from '../course/entities/course-content.entity';
import { FamilyPayment } from '../billing/entities/payment.entity';
import { LedgerEntry } from '../billing/entities/ledger-entry.entity';
import { PayStatement } from '../payroll/entities/pay-statement.entity';
import { Certificate } from '../certificate/entities/certificate.entity';
import { User } from '../user/entities/user.entity';

const mockModel = () => ({
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
      lean: jest.fn().mockResolvedValue([]),
    }),
    lean: jest.fn().mockResolvedValue([]),
  }),
  findOne: jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
    lean: jest.fn().mockResolvedValue(null),
  }),
  findById: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue(null),
  }),
});

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getModelToken(Group.name), useFactory: mockModel },
        { provide: getModelToken(Session.name), useFactory: mockModel },
        { provide: getModelToken(Task.name), useFactory: mockModel },
        { provide: getModelToken(CourseContent.name), useFactory: mockModel },
        { provide: getModelToken(FamilyPayment.name), useFactory: mockModel },
        { provide: getModelToken(LedgerEntry.name), useFactory: mockModel },
        { provide: getModelToken(PayStatement.name), useFactory: mockModel },
        { provide: getModelToken(Certificate.name), useFactory: mockModel },
        { provide: getModelToken(User.name), useFactory: mockModel },
      ],
    }).compile();
    service = module.get(DashboardService);
  });

  it('getAdminCounts returns zero counts for empty collections', async () => {
    const result = await service.getAdminCounts('userId', '507f1f77bcf86cd799439011', []);
    expect(result.atRiskGroups).toBe(0);
    expect(result.openTasks).toBe(0);
  });

  it('getTeacherDashboard returns empty sessions for empty collection', async () => {
    const result = await service.getTeacherDashboard('507f1f77bcf86cd799439012', '507f1f77bcf86cd799439011');
    expect(result.sessions).toHaveLength(0);
  });

  it('getParentDashboard returns empty children for empty collection', async () => {
    const result = await service.getParentDashboard('507f1f77bcf86cd799439013', '507f1f77bcf86cd799439011');
    expect(result.children).toHaveLength(0);
  });
});
