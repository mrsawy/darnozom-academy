import { SHARIA_MIGRATED_COMMENT, SHARIA_SUPERSEDED_COMMENT, ShariaStatus } from './sharia.types';

describe('Sharia shared types', () => {
  it('has exactly three review states', () => {
    expect(Object.values(ShariaStatus)).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
  });

  it('names the two machine-written review comments', () => {
    expect(SHARIA_SUPERSEDED_COMMENT).toBe('SUPERSEDED');
    expect(SHARIA_MIGRATED_COMMENT).toBe('MIGRATED');
  });

  it('keeps its states distinct from the platform ApprovalStatus, which has four', () => {
    expect(Object.values(ShariaStatus)).not.toContain('PENDING_UPDATE');
  });
});
