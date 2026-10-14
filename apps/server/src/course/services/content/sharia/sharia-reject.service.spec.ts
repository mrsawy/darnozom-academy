import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ShariaErrors, ShariaStatus } from '@darnozom/shared-types';
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
    listForContent: jest.fn(async () => (foundVersion ? [foundVersion] : [])),
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
  return { service, versions, contentModel, contentService, notifications, cleanup };
};

describe('ShariaReviewService.reject', () => {
  it('requires a comment', async () => {
    const { service, versions } = makeService(version(), contentDoc());
    await expect(service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, '   ')).rejects.toThrow(
      new BadRequestException(ShariaErrors.REJECT_COMMENT_REQUIRED)
    );
    expect(versions.markReviewed).not.toHaveBeenCalled();
  });

  it('records the rejection with the reviewer’s comment', async () => {
    const { service, versions } = makeService(version(), contentDoc());
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'Needs a source for the hadith.');
    expect(versions.markReviewed).toHaveBeenCalledWith(VERSION_ID, ShariaStatus.REJECTED, String(REVIEWER), 'Needs a source for the hadith.');
  });

  it('leaves live approved content untouched when a pending edit is rejected', async () => {
    const { service, contentModel, contentService } = makeService(version(), contentDoc());
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.');
    expect(contentService.update).not.toHaveBeenCalled();
    expect(contentModel.updateOne).toHaveBeenCalledWith({ _id: CONTENT }, { $set: { pendingVersion: null } });
  });

  it('marks never-approved content rejected, so the author sees why', async () => {
    const neverApproved = contentDoc({ shariaStatus: ShariaStatus.PENDING, currentVersion: 3, pendingVersion: null });
    const { service, contentModel } = makeService(version(), neverApproved);
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'Not acceptable.');
    expect(contentModel.updateOne).toHaveBeenCalledWith({ _id: CONTENT }, { $set: { shariaStatus: ShariaStatus.REJECTED, pendingVersion: null } });
  });

  it('never notifies students on a rejection', async () => {
    const { service, notifications } = makeService(version(), contentDoc());
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.');
    expect(notifications.notifyStudentsIfVisible).not.toHaveBeenCalled();
  });

  it('asks the cleanup service to consider the rejected version’s file', async () => {
    const { service, cleanup } = makeService(version({ changes: { fileKey: 'uploads/a.pdf' } }), contentDoc());
    await service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.');
    expect(cleanup.onVersionClosed).toHaveBeenCalledWith(CONTENT, { fileKey: 'uploads/a.pdf' });
  });

  it('404s on a version that does not exist', async () => {
    const { service } = makeService(null, contentDoc());
    await expect(service.reject(String(REVIEWER), String(ORG), String(CONTENT), 9, 'No.')).rejects.toThrow(
      new NotFoundException(ShariaErrors.VERSION_NOT_FOUND)
    );
  });

  it('409s on a version someone already reviewed', async () => {
    const { service } = makeService(version({ shariaStatus: ShariaStatus.APPROVED }), contentDoc());
    await expect(service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.')).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED)
    );
  });

  it('409s when another reviewer won the race', async () => {
    const { service } = makeService(version(), contentDoc(), false);
    await expect(service.reject(String(REVIEWER), String(ORG), String(CONTENT), 3, 'No.')).rejects.toThrow(
      new ConflictException(ShariaErrors.VERSION_ALREADY_REVIEWED)
    );
  });
});
