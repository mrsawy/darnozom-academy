import { ConflictException } from '@nestjs/common';
import { ShariaErrors, SHARIA_SUPERSEDED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ShariaReviewService } from './sharia-review.service';

const ORG = new Types.ObjectId();
const CONTENT = new Types.ObjectId();
const REVIEWER = new Types.ObjectId();
const VERSION_ID = new Types.ObjectId();

const version = (overrides: Record<string, unknown> = {}) => ({
  _id: VERSION_ID,
  organizationId: ORG,
  contentId: CONTENT,
  courseId: new Types.ObjectId(),
  version: 3,
  changes: { title: 'Reworded' },
  createdBy: new Types.ObjectId(),
  shariaStatus: ShariaStatus.PENDING,
  reviewedBy: null,
  reviewedAt: null,
  reviewComment: null,
  ...overrides,
});

const contentDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: CONTENT,
  organizationId: ORG,
  title: 'Lesson 1',
  shariaStatus: ShariaStatus.APPROVED,
  currentVersion: 2,
  pendingVersion: 3,
  ...overrides,
});

const makeService = (foundVersion: Record<string, unknown> | null, content: Record<string, unknown> | null, markReviewedWins = true) => {
  const versions = {
    findVersion: jest.fn(async () => foundVersion),
    listForContent: jest.fn(async () => []),
    markReviewed: jest.fn(async () => markReviewedWins),
    supersedePending: jest.fn(async () => 0),
  };
  const contentModel = {
    findOne: jest.fn(() => ({ lean: () => ({ exec: async () => content }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
    aggregate: jest.fn(async () => []),
  };
  const contentService = { update: jest.fn(async () => contentDoc()) };
  const notifications = { notifyStudentsIfVisible: jest.fn(async () => void 0) };
  const cleanup = { onVersionClosed: jest.fn(async () => void 0) };
  const service = new ShariaReviewService(
    contentModel as never,
    versions as never,
    contentService as never,
    notifications as never,
    cleanup as never
  );
  return { service, versions, contentModel, contentService, notifications };
};

describe('ShariaReviewService.approve — a held-back edit', () => {
  it('replays the change-set through the existing update path, bypassing the gate', async () => {
    const { service, contentService } = makeService(version(), contentDoc());
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(contentService.update).toHaveBeenCalledWith(String(CONTENT), expect.objectContaining({ title: 'Reworded' }), {
      shariaBypass: true,
    });
  });

  it('moves currentVersion to the approved version and clears the pointer', async () => {
    const { service, contentModel } = makeService(version(), contentDoc());
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(contentModel.updateOne).toHaveBeenCalledWith(
      { _id: CONTENT },
      { $set: { shariaStatus: ShariaStatus.APPROVED, currentVersion: 3, pendingVersion: null } }
    );
  });

  it('records the approval against the version', async () => {
    const { service, versions } = makeService(version(), contentDoc());
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(versions.markReviewed).toHaveBeenCalledWith(VERSION_ID, ShariaStatus.APPROVED, String(REVIEWER), null);
  });
});

describe('ShariaReviewService.approve — content that was never approved', () => {
  it('applies no replay, because the values are already on the document', async () => {
    const neverApproved = contentDoc({ shariaStatus: ShariaStatus.PENDING, currentVersion: 3, pendingVersion: null });
    const { service, contentService, contentModel } = makeService(version(), neverApproved);
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(contentService.update).not.toHaveBeenCalled();
    expect(contentModel.updateOne).toHaveBeenCalledWith(
      { _id: CONTENT },
      { $set: { shariaStatus: ShariaStatus.APPROVED, currentVersion: 3, pendingVersion: null } }
    );
  });

  it('notifies students, which is the first moment they may see it', async () => {
    const neverApproved = contentDoc({ shariaStatus: ShariaStatus.PENDING, currentVersion: 3, pendingVersion: null });
    const { service, notifications } = makeService(version(), neverApproved);
    await service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3);
    expect(notifications.notifyStudentsIfVisible).toHaveBeenCalledWith(String(CONTENT), undefined);
  });
});

describe('ShariaReviewService.approve — guards', () => {
  it('refuses a version a newer edit superseded', async () => {
    const superseded = version({ shariaStatus: ShariaStatus.REJECTED, reviewComment: SHARIA_SUPERSEDED_COMMENT });
    const { service, contentService } = makeService(superseded, contentDoc({ pendingVersion: 4 }));
    await expect(service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3)).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED)
    );
    expect(contentService.update).not.toHaveBeenCalled();
  });

  it('refuses a version that is not the one the content is waiting on', async () => {
    const { service, contentService } = makeService(version({ version: 3 }), contentDoc({ pendingVersion: 4 }));
    await expect(service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3)).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_NOT_PENDING)
    );
    expect(contentService.update).not.toHaveBeenCalled();
  });

  it('refuses when another reviewer won the race, and never replays', async () => {
    const { service, contentService } = makeService(version(), contentDoc(), false);
    await expect(service.approve(String(REVIEWER), String(ORG), String(CONTENT), 3)).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED)
    );
    expect(contentService.update).not.toHaveBeenCalled();
  });
});
