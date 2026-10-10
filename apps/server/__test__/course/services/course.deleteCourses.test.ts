import mongoose from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CourseService } from '../../../src/course/services/course.service';
import { COURSE_CATEGORY_CHANGED_EVENT } from '../../../src/category/events/category-count.events';
import { COURSE_DELETED_EVENT } from '../../../src/subscription/events/course-deleted.event';

describe('CourseService.deleteCourses (soft delete keeps media)', () => {
  const courseId = new mongoose.Types.ObjectId();
  const moduleId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();
  const instructorId = new mongoose.Types.ObjectId();
  const deletedBy = new mongoose.Types.ObjectId();

  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const findSession = jest.fn();
  const find = jest.fn().mockReturnValue({ session: findSession });
  const updateManySession = jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  const updateMany = jest.fn().mockReturnValue({ session: updateManySession });
  const courseModel = { find, updateMany };

  const enrollmentUpdateManySession = jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  const enrollmentUpdateMany = jest.fn().mockReturnValue({ session: enrollmentUpdateManySession });
  const enrollmentModel = { updateMany: enrollmentUpdateMany };

  const courseModuleService = {
    deleteModules: jest.fn().mockResolvedValue(undefined),
  };
  const fileService = {
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getFileUrl: jest.fn(),
  };
  const eventEmitter = {
    emit: jest.fn(),
  };
  const connection = {
    startSession: jest.fn().mockResolvedValue(session),
  };

  const unused = {} as never;
  const service = new CourseService(
    connection as never,
    courseModel as never,
    unused,
    unused,
    unused,
    unused,
    enrollmentModel as never,
    unused,
    courseModuleService as never,
    fileService as never,
    unused,
    eventEmitter as unknown as EventEmitter2
  );

  beforeEach(() => {
    jest.clearAllMocks();
    connection.startSession.mockResolvedValue(session);
    find.mockReturnValue({ session: findSession });
    findSession.mockResolvedValue([
      {
        _id: courseId,
        modulesIds: [moduleId],
        categoriesIds: [categoryId],
        instructorId,
        thumbnailKey: 'thumb.jpg',
        trailerKey: 'trailer.mp4',
        pendingUpdate: { thumbnailKey: 'pending-thumb.jpg' },
      },
    ]);
    updateMany.mockReturnValue({ session: updateManySession });
    enrollmentUpdateMany.mockReturnValue({ session: enrollmentUpdateManySession });
    courseModuleService.deleteModules.mockResolvedValue(undefined);
  });

  it('cascades modules + enrollments, keeps S3 files, and does not emit course.deleted billing events', async () => {
    await service.deleteCourses([courseId.toString()], deletedBy.toString());

    expect(courseModuleService.deleteModules).toHaveBeenCalledWith([moduleId.toString()], session, deletedBy.toString());
    expect(enrollmentUpdateMany).toHaveBeenCalledWith(
      { courseId: { $in: [courseId] } },
      expect.objectContaining({ $set: expect.objectContaining({ deletedById: expect.anything() }) })
    );
    expect(fileService.deleteFile).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalledWith(COURSE_DELETED_EVENT, expect.anything());
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      COURSE_CATEGORY_CHANGED_EVENT,
      expect.objectContaining({
        addedCategoryIds: [],
        removedCategoryIds: [categoryId.toString()],
        instructorId: instructorId.toString(),
      })
    );
    expect(updateMany).toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalled();
  });
});
