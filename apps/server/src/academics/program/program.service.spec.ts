import { ConflictException, NotFoundException } from '@nestjs/common';
import { AcademicsErrors, Roles } from '@darnozom/shared-types';
import { mockQuery } from '__test__/academics/mock-query';
import { AcademicsActor } from '../common/actor';
import { ProgramService } from './program.service';

const actor: AcademicsActor = { _id: '64b0000000000000000000aa', organizationId: '64b0000000000000000000bb', roleName: Roles.MANAGER, additionalRoles: [] };
const programId = '64b0000000000000000000cc';
const courseId = '64b0000000000000000000dd';

function setup() {
  const programModel = { find: jest.fn(), findOne: jest.fn(), findOneAndUpdate: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
  const courseModel = { find: jest.fn(), findOne: jest.fn(), countDocuments: jest.fn(), updateOne: jest.fn() };
  const service = new ProgramService(programModel as never, courseModel as never);
  return { service, programModel, courseModel };
}

describe('ProgramService', () => {
  it('creates a program in the actor organization with a trimmed name', async () => {
    const { service, programModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery(null));
    programModel.create.mockResolvedValue({ toObject: () => ({ _id: programId, name: 'Quran' }) });

    await expect(service.create(actor, { name: ' Quran ' })).resolves.toEqual({ _id: programId, name: 'Quran' });
    const created = programModel.create.mock.calls[0][0];
    expect(String(created.organizationId)).toBe(actor.organizationId);
    expect(created.name).toBe('Quran');
  });

  it('rejects a duplicate name in the same organization', async () => {
    const { service, programModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: 'other' }));
    await expect(service.create(actor, { name: 'Quran' })).rejects.toThrow(new ConflictException(AcademicsErrors.PROGRAM_NAME_ALREADY_EXISTS));
    expect(programModel.create).not.toHaveBeenCalled();
  });

  it('scopes updates to the actor organization and 404s otherwise', async () => {
    const { service, programModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery(null));
    programModel.findOneAndUpdate.mockReturnValue(mockQuery(null));
    await expect(service.update(actor, programId, { name: 'New' })).rejects.toThrow(new NotFoundException(AcademicsErrors.PROGRAM_NOT_FOUND));
    expect(String(programModel.findOneAndUpdate.mock.calls[0][0].organizationId)).toBe(actor.organizationId);
  });

  it('refuses to delete a program that still has courses', async () => {
    const { service, programModel, courseModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: programId }));
    courseModel.countDocuments.mockReturnValue(mockQuery(2));
    await expect(service.remove(actor, programId)).rejects.toThrow(new ConflictException(AcademicsErrors.HAS_DEPENDENTS));
    expect(programModel.updateOne).not.toHaveBeenCalled();
  });

  it('soft-deletes a program without courses', async () => {
    const { service, programModel, courseModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: programId }));
    courseModel.countDocuments.mockReturnValue(mockQuery(0));
    programModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await expect(service.remove(actor, programId)).resolves.toEqual({ message: 'academicsDeletedSuccessfully' });
    expect(programModel.updateOne.mock.calls[0][1].$set.deletedAt).toBeInstanceOf(Date);
  });

  it('links only courses of the same organization', async () => {
    const { service, programModel, courseModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: programId }));
    courseModel.findOne.mockReturnValue(mockQuery(null));
    await expect(service.linkCourse(actor, programId, courseId)).rejects.toThrow(new NotFoundException(AcademicsErrors.COURSE_NOT_FOUND_IN_ORGANIZATION));
    expect(String(courseModel.findOne.mock.calls[0][0].organizationId)).toBe(actor.organizationId);
    expect(courseModel.updateOne).not.toHaveBeenCalled();
  });

  it('links a course of the same organization', async () => {
    const { service, programModel, courseModel } = setup();
    programModel.findOne.mockReturnValue(mockQuery({ _id: programId }));
    courseModel.findOne.mockReturnValue(mockQuery({ _id: courseId }));
    courseModel.updateOne.mockReturnValue(mockQuery({ modifiedCount: 1 }));
    await expect(service.linkCourse(actor, programId, courseId)).resolves.toEqual({ programId, courseId });
    expect(String(courseModel.updateOne.mock.calls[0][1].$set.programId)).toBe(programId);
  });
});
