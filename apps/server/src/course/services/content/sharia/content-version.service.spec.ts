import { SHARIA_SUPERSEDED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ContentVersionService } from './content-version.service';

const ORG = new Types.ObjectId();
const CONTENT = new Types.ObjectId();
const COURSE = new Types.ObjectId();
const AUTHOR = new Types.ObjectId();

const makeService = (highest: { version: number } | null) => {
  const created: Record<string, unknown>[] = [];
  const model = {
    findOne: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => highest }) }) })),
    find: jest.fn(() => ({ sort: () => ({ lean: () => ({ exec: async () => created }) }) })),
    create: jest.fn(async (doc: Record<string, unknown>) => {
      created.push({ ...doc, _id: new Types.ObjectId() });
      return created.at(-1);
    }),
    updateMany: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
    updateOne: jest.fn(() => ({ exec: async () => ({ modifiedCount: 1 }) })),
  };
  return { service: new ContentVersionService(model as never), model, created };
};

const input = { organizationId: ORG, contentId: CONTENT, courseId: COURSE, changes: { title: 'x' }, createdBy: AUTHOR };

describe('ContentVersionService.record', () => {
  it('numbers the first version 1', async () => {
    const { service } = makeService(null);
    await expect(service.record(input)).resolves.toMatchObject({ version: 1 });
  });

  it('numbers the next version one above the highest, not above the count', async () => {
    const { service } = makeService({ version: 7 });
    await expect(service.record(input)).resolves.toMatchObject({ version: 8 });
  });

  it('records a new version as pending review', async () => {
    const { service } = makeService(null);
    await expect(service.record(input)).resolves.toMatchObject({ shariaStatus: ShariaStatus.PENDING });
  });

  it('stores the change-set verbatim', async () => {
    const { service } = makeService(null);
    const result = await service.record({ ...input, changes: { title: 'x', body: '<p>y</p>' } });
    expect(result.changes).toEqual({ title: 'x', body: '<p>y</p>' });
  });
});

describe('ContentVersionService.supersedePending', () => {
  it('rejects every other pending version with the SUPERSEDED comment', async () => {
    const { service, model } = makeService(null);
    await service.supersedePending(CONTENT, 9);
    expect(model.updateMany).toHaveBeenCalledWith(
      { contentId: CONTENT, shariaStatus: ShariaStatus.PENDING, version: { $ne: 9 } },
      {
        $set: {
          shariaStatus: ShariaStatus.REJECTED,
          reviewComment: SHARIA_SUPERSEDED_COMMENT,
          reviewedAt: expect.any(Date),
          reviewedBy: null,
        },
      },
    );
  });
});

describe('ContentVersionService.markReviewed', () => {
  it('writes the outcome only onto a version still pending, so a review cannot be redone', async () => {
    const { service, model } = makeService(null);
    const versionId = new Types.ObjectId();
    await service.markReviewed(versionId, ShariaStatus.APPROVED, AUTHOR, null);
    const calls = (model.updateOne as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [filter, update] = calls[0] as [any, any];
    expect(filter).toEqual({ _id: versionId, shariaStatus: ShariaStatus.PENDING });
    expect(update.$set).toMatchObject({ shariaStatus: ShariaStatus.APPROVED, reviewedBy: AUTHOR, reviewComment: null });
  });

  it('returns true when it wins the race against another reviewer', async () => {
    const { service } = makeService(null);
    const versionId = new Types.ObjectId();
    await expect(service.markReviewed(versionId, ShariaStatus.APPROVED, AUTHOR, null)).resolves.toBe(true);
  });
});
