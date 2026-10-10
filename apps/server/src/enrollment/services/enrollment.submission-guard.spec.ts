import { ForbiddenException } from '@nestjs/common';
import mongoose from 'mongoose';
import { EnrollmentService } from './enrollment.service';

/**
 * P1.3: a student must not be able to submit to (or snapshot) content that
 * belongs to a course other than the one their enrollment is for. The guard is
 * a pure comparison, so we instantiate the service without its injected deps.
 */
describe('EnrollmentService.assertContentMatchesEnrollment', () => {
  const service = new (EnrollmentService as unknown as new () => EnrollmentService)();

  const call = (contentCourseId: mongoose.Types.ObjectId | undefined, enrollmentCourseId?: mongoose.Types.ObjectId) =>
    (service as unknown as { assertContentMatchesEnrollment: (c: unknown, e: unknown) => void }).assertContentMatchesEnrollment(contentCourseId, {
      courseId: enrollmentCourseId,
    });

  it('passes when the content course matches the enrollment course', () => {
    const courseId = new mongoose.Types.ObjectId();
    expect(() => call(courseId, courseId)).not.toThrow();
  });

  it('passes when the two ids are different objects but the same value', () => {
    const id = new mongoose.Types.ObjectId();
    expect(() => call(new mongoose.Types.ObjectId(id.toString()), new mongoose.Types.ObjectId(id.toString()))).not.toThrow();
  });

  it('throws ForbiddenException when content belongs to a different course', () => {
    expect(() => call(new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId())).toThrow(ForbiddenException);
  });

  it('is lenient when either id is missing (other guards handle those cases)', () => {
    const courseId = new mongoose.Types.ObjectId();
    expect(() => call(undefined, courseId)).not.toThrow();
    expect(() => call(courseId)).not.toThrow();
  });
});
