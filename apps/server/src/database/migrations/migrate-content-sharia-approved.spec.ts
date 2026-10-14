import { SHARIA_MIGRATED_COMMENT, ShariaStatus } from '@darnozom/shared-types';
import { Types } from 'mongoose';
import { buildMigrationVersion } from './migrate-content-sharia-approved';

const content = {
  _id: new Types.ObjectId(),
  organizationId: new Types.ObjectId(),
  courseId: new Types.ObjectId(),
  title: 'Lesson 1',
  type: 'ARTICLE',
  fileKey: 'uploads/a.pdf',
  approvalStatus: 'APPROVED',
  pendingUpdate: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
};

describe('buildMigrationVersion', () => {
  it('creates version 1, already approved', () => {
    const version = buildMigrationVersion(content);
    expect(version.version).toBe(1);
    expect(version.shariaStatus).toBe(ShariaStatus.APPROVED);
  });

  it('records that it was a migration, with no human reviewer', () => {
    const version = buildMigrationVersion(content);
    expect(version.reviewComment).toBe(SHARIA_MIGRATED_COMMENT);
    expect(version.reviewedBy).toBeNull();
  });

  it('snapshots the content’s own values as the change-set', () => {
    const version = buildMigrationVersion(content);
    expect(version.changes).toMatchObject({ title: 'Lesson 1', type: 'ARTICLE', fileKey: 'uploads/a.pdf' });
  });

  it('keeps the platform approval fields out of the snapshot, which belong to the other gate', () => {
    const version = buildMigrationVersion(content);
    expect(version.changes).not.toHaveProperty('approvalStatus');
    expect(version.changes).not.toHaveProperty('pendingUpdate');
    expect(version.changes).not.toHaveProperty('_id');
  });
});
