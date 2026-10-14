import { ApprovalStatus, ShariaStatus } from '@darnozom/shared-types';
import { APPROVED_STATUSES } from 'src/utils/approval.utils';
import { STUDENT_VISIBLE_CONTENT_FILTER, isStudentVisible } from './student-visible-filter';

describe('STUDENT_VISIBLE_CONTENT_FILTER', () => {
  it('keeps the platform approval filter exactly as it is', () => {
    expect(STUDENT_VISIBLE_CONTENT_FILTER.approvalStatus).toEqual({ $in: APPROVED_STATUSES });
  });

  it('adds the Sharia gate beside it', () => {
    expect(STUDENT_VISIBLE_CONTENT_FILTER.shariaStatus).toBe(ShariaStatus.APPROVED);
  });
});

describe('isStudentVisible', () => {
  it('is true only when both gates pass', () => {
    expect(isStudentVisible(ApprovalStatus.APPROVED, ShariaStatus.APPROVED)).toBe(true);
    expect(isStudentVisible(ApprovalStatus.PENDING_UPDATE, ShariaStatus.APPROVED)).toBe(true);
  });

  it('hides content the Sharia reviewer has not passed, even once the platform approved it', () => {
    expect(isStudentVisible(ApprovalStatus.APPROVED, ShariaStatus.PENDING)).toBe(false);
    expect(isStudentVisible(ApprovalStatus.APPROVED, ShariaStatus.REJECTED)).toBe(false);
  });

  it('hides content the platform has not approved, even once the reviewer passed it', () => {
    expect(isStudentVisible(ApprovalStatus.PENDING, ShariaStatus.APPROVED)).toBe(false);
    expect(isStudentVisible(ApprovalStatus.REJECTED, ShariaStatus.APPROVED)).toBe(false);
  });
});
