import { AtRiskReason, TaskStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { TaskRiskService } from './task-risk.service';

const GROUP = new Types.ObjectId();
const NOW = new Date('2026-03-10T00:00:00.000Z');

const makeService = (group: Record<string, unknown> | null, openTasks: Record<string, unknown>[]) => {
  const groupModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => group }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  const taskModel = { countDocuments: jest.fn(() => ({ exec: async () => openTasks.length })) };
  return { service: new TaskRiskService(taskModel as never, groupModel as never), groupModel, taskModel };
};

describe('TaskRiskService.refresh', () => {
  it('clears the flag once the group has a coordinator and no open tasks', async () => {
    const { service, groupModel } = makeService({ _id: GROUP, coordinatorId: new Types.ObjectId(), atRisk: true }, []);
    await service.refresh(GROUP, NOW);
    expect(groupModel.updateOne).toHaveBeenCalledWith({ _id: GROUP }, { $set: { atRisk: false, atRiskSince: null, atRiskReason: null } });
  });

  it('keeps the flag while an open task remains', async () => {
    const { service, groupModel } = makeService({ _id: GROUP, coordinatorId: new Types.ObjectId(), atRisk: true }, [{ status: TaskStatus.OPEN }]);
    await service.refresh(GROUP, NOW);
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });

  it('keeps the flag while the group has no coordinator, even with no open tasks', async () => {
    const { service, groupModel } = makeService({ _id: GROUP, coordinatorId: null, atRisk: true }, []);
    await service.refresh(GROUP, NOW);
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });

  it('does nothing for a group that is not at risk', async () => {
    const { service, groupModel, taskModel } = makeService({ _id: GROUP, coordinatorId: new Types.ObjectId(), atRisk: false }, []);
    await service.refresh(GROUP, NOW);
    expect(taskModel.countDocuments).not.toHaveBeenCalled();
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });

  it('does nothing for a group that no longer exists', async () => {
    const { service, groupModel } = makeService(null, []);
    await expect(service.refresh(GROUP, NOW)).resolves.toBeUndefined();
    expect(groupModel.updateOne).not.toHaveBeenCalled();
  });
});

describe('TaskRiskService.flag', () => {
  it('records the reason and the moment, and does not overwrite an existing flag', async () => {
    const { service, groupModel } = makeService({ _id: GROUP, coordinatorId: null, atRisk: false }, []);
    await service.flag(GROUP, AtRiskReason.TASK_ESCALATED, NOW);
    expect(groupModel.updateOne).toHaveBeenCalledWith(
      { _id: GROUP, atRisk: false },
      { $set: { atRisk: true, atRiskSince: NOW, atRiskReason: AtRiskReason.TASK_ESCALATED } }
    );
  });
});
