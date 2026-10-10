import { NotFoundException } from '@nestjs/common';
import { AdminReviewCourseService } from '../../../src/admin-review/services/admin-review-course.service';

describe('AdminReviewCourseService.adminDeleteCourse', () => {
  const courseId = 'course-1';
  const deletedById = 'admin-1';

  const courseModel = {
    findById: jest.fn(),
    updateOne: jest.fn(),
  };
  const courseService = {
    deleteCourses: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AdminReviewCourseService(courseModel as never, courseService as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
    courseService.deleteCourses.mockResolvedValue(undefined);
  });

  it('cascades through CourseService.deleteCourses instead of only soft-deleting the course', async () => {
    courseModel.findById.mockResolvedValue({ _id: courseId });

    await expect(service.adminDeleteCourse(courseId, deletedById)).resolves.toEqual({
      success: true,
      deletedId: courseId,
    });

    expect(courseService.deleteCourses).toHaveBeenCalledWith([courseId], deletedById);
    expect(courseModel.updateOne).not.toHaveBeenCalled();
  });

  it('throws when the course does not exist', async () => {
    courseModel.findById.mockResolvedValue(null);

    await expect(service.adminDeleteCourse(courseId, deletedById)).rejects.toBeInstanceOf(NotFoundException);
    expect(courseService.deleteCourses).not.toHaveBeenCalled();
  });
});
