import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { CohortService } from './cohort.service';

const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: '64b0000000000000000000bb', roleName: Roles.MANAGER, additionalRoles: [] };
const levelId = '64b0000000000000000000ee';
const cohortId = '64b0000000000000000000ff';

function setup() {
  const cohortModel = { find: jest.fn(), findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
  const levelModel = { findOne: jest.fn() };
  const groupModel = { countDocuments: jest.fn() };
  const service = new CohortService(cohortModel as never, levelModel as never, groupModel as never);
  return { service, cohortModel, levelModel, groupModel };
}

describe('CohortService', () => {
  it('rejects a level from another organization', async () => {
    const { service, levelModel } = setup();
    levelModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.create(actor, { levelId, name: 'Oct 2026', startDate: '2026-10-20' })).rejects.toThrow(new NotFoundException(AcademicsErrors.LEVEL_NOT_FOUND));
  });

  it('creates a cohort with a Date startDate', async () => {
    const { service, levelModel, cohortModel } = setup();
    levelModel.findOne.mockReturnValue(mockQuery({ _id: levelId }));
    cohortModel.create.mockResolvedValue({ toObject: () => ({ _id: cohortId }) });
    await service.create(actor, { levelId, name: 'Oct 2026', startDate: '2026-10-20' });
    expect(cohortModel.create.mock.calls[0][0].startDate).toBeInstanceOf(Date);
  });

  it('refuses to delete a cohort that has groups', async () => {
    const { service, cohortModel, groupModel } = setup();
    cohortModel.findOne.mockReturnValue(mockQuery({ _id: cohortId }));
    groupModel.countDocuments.mockReturnValue(mockQuery(3));
    await expect(service.remove(actor, cohortId)).rejects.toThrow(new ConflictException(AcademicsErrors.HAS_DEPENDENTS));
  });
});
