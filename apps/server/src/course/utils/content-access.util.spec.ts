import { NotFoundException } from '@nestjs/common';
import { ActiveStatus, ApprovalStatus, PublishStatus } from '@lms-organization/shared-types';
import { ContentType } from '../enum/contentType.enum';
import { authorizeContentForRequester, isContentServableToStudent } from './content-access.util';

const clone = <T>(o: T): T => structuredClone(o);

describe('isContentServableToStudent', () => {
  const servable = { publishStatus: PublishStatus.PUBLISHED, approvalStatus: ApprovalStatus.APPROVED, activeStatus: ActiveStatus.ACTIVE };

  it('is true only when published + approved + active', () => {
    expect(isContentServableToStudent(servable)).toBe(true);
  });

  it('is false when not published', () => {
    expect(isContentServableToStudent({ ...servable, publishStatus: 'DRAFT' })).toBe(false);
  });

  it('is false when not approved', () => {
    expect(isContentServableToStudent({ ...servable, approvalStatus: undefined })).toBe(false);
  });

  it('is false when not active', () => {
    expect(isContentServableToStudent({ ...servable, activeStatus: undefined })).toBe(false);
  });

  it('is false when soft-deleted', () => {
    expect(isContentServableToStudent({ ...servable, deletedAt: new Date() })).toBe(false);
  });
});

describe('authorizeContentForRequester', () => {
  const servableQuiz = {
    type: ContentType.QUIZ,
    organizationId: 'org-1',
    courseId: 'course-1',
    publishStatus: PublishStatus.PUBLISHED,
    approvalStatus: ApprovalStatus.APPROVED,
    activeStatus: ActiveStatus.ACTIVE,
    questions: [{ questionText: 'q', options: ['a', 'b'], correctOption: 1 }],
    quizSubmissions: [{ studentId: 'someone-else' }],
  };

  const gate = { assertActiveEnrollmentForCourse: jest.fn() };
  beforeEach(() => jest.clearAllMocks());

  it('returns the full document for an owner (same org) without checking enrollment', async () => {
    const content = clone(servableQuiz);
    await authorizeContentForRequester(content, { _id: 'instructor', organizationId: 'org-1' }, gate);

    expect(gate.assertActiveEnrollmentForCourse).not.toHaveBeenCalled();
    expect(content.questions[0]).toHaveProperty('correctOption'); // instructor keeps the answer key
    expect(content.quizSubmissions).toBeDefined();
  });

  it('for a non-owner learner: enforces enrollment and strips the answer key + submissions', async () => {
    const content = clone(servableQuiz);
    await authorizeContentForRequester(content, { _id: 'student', organizationId: null }, gate);

    expect(gate.assertActiveEnrollmentForCourse).toHaveBeenCalledWith('course-1', 'student');
    expect(content.questions[0]).not.toHaveProperty('correctOption');
    expect(content.quizSubmissions).toBeUndefined();
  });

  it('throws NotFound when a learner requests unpublished/draft content', async () => {
    const content = { ...clone(servableQuiz), publishStatus: 'DRAFT' };
    await expect(authorizeContentForRequester(content, { _id: 'student' }, gate)).rejects.toThrow(NotFoundException);
  });

  it('propagates the enrollment gate rejection (not enrolled → no content returned)', async () => {
    gate.assertActiveEnrollmentForCourse.mockRejectedValueOnce(new Error('You are not enrolled in this course'));
    const content = clone(servableQuiz);
    await expect(authorizeContentForRequester(content, { _id: 'student' }, gate)).rejects.toThrow('not enrolled');
    // answer key must not have been stripped-then-returned; the throw happens first
    expect(content.questions[0]).toHaveProperty('correctOption');
  });
});
