import { ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ShariaGateService } from './sharia-gate.service';

const CONTENT = new Types.ObjectId();
const ORG = new Types.ObjectId();
const COURSE = new Types.ObjectId();
const AUTHOR = new Types.ObjectId();

const content = (shariaStatus: ShariaStatus) => ({ _id: CONTENT, organizationId: ORG, courseId: COURSE, shariaStatus });

const makeService = (recordedVersion = 2) => {
  const versions = {
    record: jest.fn(async (input: Record<string, unknown>) => ({ _id: new Types.ObjectId(), version: recordedVersion, ...input })),
    supersedePending: jest.fn(async () => 0),
  };
  const contentModel = { updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })) };
  return { service: new ShariaGateService(contentModel as never, versions as never), versions, contentModel };
};

describe('ShariaGateService.onCreated', () => {
  it('records the creation payload as version 1', async () => {
    const { service, versions } = makeService(1);
    await service.onCreated(content(ShariaStatus.PENDING), { title: 'Lesson 1' }, AUTHOR);
    expect(versions.record).toHaveBeenCalledWith(
      expect.objectContaining({ contentId: CONTENT, courseId: COURSE, changes: { title: 'Lesson 1' }, createdBy: AUTHOR })
    );
  });

  it('leaves the new content pending and at version 1', async () => {
    const { service, contentModel } = makeService(1);
    await service.onCreated(content(ShariaStatus.PENDING), { title: 'Lesson 1' }, AUTHOR);
    expect(contentModel.updateOne).toHaveBeenCalledWith(
      { _id: CONTENT },
      { $set: { shariaStatus: ShariaStatus.PENDING, currentVersion: 1, pendingVersion: null } }
    );
  });
});

describe('ShariaGateService.beforeUpdate', () => {
  it('lets a non-editorial edit through without recording a version', async () => {
    const { service, versions, contentModel } = makeService();
    await expect(service.beforeUpdate(content(ShariaStatus.APPROVED), { publishStatus: 'PUBLISHED' }, AUTHOR)).resolves.toBe(true);
    expect(versions.record).not.toHaveBeenCalled();
    expect(contentModel.updateOne).not.toHaveBeenCalled();
  });

  it('applies an edit to content that was never approved and records a pending version', async () => {
    const { service, versions, contentModel } = makeService();
    await expect(service.beforeUpdate(content(ShariaStatus.REJECTED), { title: 'fixed' }, AUTHOR)).resolves.toBe(true);
    expect(versions.record).toHaveBeenCalled();
    expect(contentModel.updateOne).toHaveBeenCalledWith(
      { _id: CONTENT },
      { $set: { shariaStatus: ShariaStatus.PENDING, currentVersion: 2, pendingVersion: null } }
    );
  });

  it('holds an edit to approved content back and points pendingVersion at it', async () => {
    const { service, versions, contentModel } = makeService(5);
    await expect(service.beforeUpdate(content(ShariaStatus.APPROVED), { title: 'reworded' }, AUTHOR)).resolves.toBe(false);
    expect(versions.record).toHaveBeenCalled();
    expect(contentModel.updateOne).toHaveBeenCalledWith({ _id: CONTENT }, { $set: { pendingVersion: 5 } });
  });

  it('supersedes an earlier pending edit when a second one arrives', async () => {
    const { service, versions } = makeService(6);
    await service.beforeUpdate(content(ShariaStatus.APPROVED), { title: 'again' }, AUTHOR);
    expect(versions.supersedePending).toHaveBeenCalledWith(CONTENT, 6);
  });

  it('does not touch the live shariaStatus when holding an edit back', async () => {
    const { service, contentModel } = makeService(5);
    await service.beforeUpdate(content(ShariaStatus.APPROVED), { title: 'reworded' }, AUTHOR);
    const call = contentModel.updateOne.mock.calls[0] as unknown as [unknown, { $set?: Record<string, unknown> }];
    const update = call[1];
    expect(update.$set).not.toHaveProperty('shariaStatus');
  });
});
