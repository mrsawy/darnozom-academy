import { ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { ShariaFileCleanupService } from './sharia-file-cleanup.service';

const CONTENT = new Types.ObjectId();

const makeService = (approvedCount: number, liveFileKey: string | null = null) => {
  const versionModel = { countDocuments: jest.fn(() => ({ exec: async () => approvedCount })) };
  const contentModel = { findOne: jest.fn(() => ({ lean: () => ({ exec: async () => ({ _id: CONTENT, fileKey: liveFileKey }) }) })) };
  const files = { deleteFile: jest.fn(async () => void 0) };
  return { service: new ShariaFileCleanupService(versionModel as never, contentModel as never, files as never), versionModel, files };
};

describe('ShariaFileCleanupService.onVersionClosed', () => {
  it('does nothing when the closed version carried no file', async () => {
    const { service, files } = makeService(0);
    await service.onVersionClosed(CONTENT, { title: 'x' });
    expect(files.deleteFile).not.toHaveBeenCalled();
  });

  it('deletes the orphaned file when no approved version references it', async () => {
    const { service, files } = makeService(0);
    await service.onVersionClosed(CONTENT, { fileKey: 'uploads/rejected.pdf' });
    expect(files.deleteFile).toHaveBeenCalledWith('uploads/rejected.pdf');
  });

  it('keeps the file when an approved version still references it', async () => {
    const { service, files } = makeService(1);
    await service.onVersionClosed(CONTENT, { fileKey: 'uploads/shared.pdf' });
    expect(files.deleteFile).not.toHaveBeenCalled();
  });

  it('keeps the file when it is the one the live content is serving', async () => {
    const { service, files } = makeService(0, 'uploads/live.pdf');
    await service.onVersionClosed(CONTENT, { fileKey: 'uploads/live.pdf' });
    expect(files.deleteFile).not.toHaveBeenCalled();
  });

  it('asks only about approved versions holding that exact key', async () => {
    const { service, versionModel } = makeService(0);
    await service.onVersionClosed(CONTENT, { fileKey: 'uploads/a.pdf' });
    expect(versionModel.countDocuments).toHaveBeenCalledWith({
      contentId: CONTENT,
      shariaStatus: ShariaStatus.APPROVED,
      'changes.fileKey': 'uploads/a.pdf',
    });
  });

  it('swallows a storage failure, because a stranded file must not fail a review', async () => {
    const { service, files } = makeService(0);
    files.deleteFile.mockRejectedValueOnce(new Error('S3 unavailable'));
    await expect(service.onVersionClosed(CONTENT, { fileKey: 'uploads/a.pdf' })).resolves.toBeUndefined();
  });
});
