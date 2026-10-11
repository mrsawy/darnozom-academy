import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { LevelService } from './level.service';

const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: '64b0000000000000000000bb', roleName: Roles.MANAGER, additionalRoles: [] };
const courseId = '64b0000000000000000000dd';
const levelId = '64b0000000000000000000ee';

function setup() {
  const levelModel = { find: jest.fn(), findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
  const courseModel = { findOne: jest.fn() };
  const cohortModel = { countDocuments: jest.fn() };
  const service = new LevelService(levelModel as never, courseModel as never, cohortModel as never);
  return { service, levelModel, courseModel, cohortModel };
}

describe('LevelService', () => {
  it('rejects a course from another organization', async () => {
    const { service, courseModel, levelModel } = setup();
    courseModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.create(actor, { courseId, name: 'Level 1', order: 1 })).rejects.toThrow(new NotFoundException(AcademicsErrors.COURSE_NOT_FOUND_IN_ORGANIZATION));
    expect(levelModel.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate order within the same course', async () => {
    const { service, courseModel, levelModel } = setup();
    courseModel.findOne.mockReturnValue(mockQuery({ _id: courseId }));
    levelModel.findOne.mockReturnValue(mockQuery({ _id: 'existing' }));
    await expect(service.create(actor, { courseId, name: 'Level 1', order: 1 })).rejects.toThrow(new ConflictException(AcademicsErrors.LEVEL_ORDER_ALREADY_EXISTS));
  });

  it('creates a level for a course in the organization', async () => {
    const { service, courseModel, levelModel } = setup();
    courseModel.findOne.mockReturnValue(mockQuery({ _id: courseId }));
    levelModel.findOne.mockReturnValue(mockQuery(null));
    levelModel.create.mockResolvedValue({ toObject: () => ({ _id: levelId }) });
    await expect(service.create(actor, { courseId, name: 'Level 1', order: 1 })).resolves.toEqual({ _id: levelId });
    expect(String(levelModel.create.mock.calls[0][0].organizationId)).toBe(actor.organizationId);
  });

  it('refuses to delete a level that has cohorts', async () => {
    const { service, levelModel, cohortModel } = setup();
    levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId, courseId }));
    cohortModel.countDocuments.mockReturnValue(mockQuery(1));
    await expect(service.remove(actor, levelId)).rejects.toThrow(new ConflictException(AcademicsErrors.HAS_DEPENDENTS));
  });
});
