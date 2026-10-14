import { ShariaStatus } from '@darnozom/shared-types';
import { decideShariaPath, isEditorialChange } from './sharia-decision';

describe('isEditorialChange', () => {
  it('is false for an empty change-set', () => {
    expect(isEditorialChange({})).toBe(false);
  });

  it('is false when only publish and operational toggles changed', () => {
    expect(
      isEditorialChange({
        publishStatus: 'PUBLISHED',
        publishedAt: new Date(),
        settings: {},
        attendanceSettings: {},
      }),
    ).toBe(false);
  });

  it('is true as soon as one editorial field changed', () => {
    expect(isEditorialChange({ publishStatus: 'PUBLISHED', title: 'New title' })).toBe(true);
  });

  it('is true for a replaced file', () => {
    expect(isEditorialChange({ fileKey: 'uploads/new.pdf' })).toBe(true);
  });
});

describe('decideShariaPath', () => {
  it('lets a non-editorial edit through ungated, whatever the review state', () => {
    for (const status of Object.values(ShariaStatus)) {
      expect(decideShariaPath(status, { publishStatus: 'PUBLISHED' })).toBe('APPLY_UNGATED');
    }
  });

  it('applies an edit to content that was never approved and sends it back for review', () => {
    expect(decideShariaPath(ShariaStatus.PENDING, { title: 'x' })).toBe('APPLY_AND_PEND');
    expect(decideShariaPath(ShariaStatus.REJECTED, { title: 'x' })).toBe('APPLY_AND_PEND');
  });

  it('holds an edit to approved content back, so students keep seeing the approved values', () => {
    expect(decideShariaPath(ShariaStatus.APPROVED, { title: 'x' })).toBe('HOLD_AS_PENDING');
  });
});
