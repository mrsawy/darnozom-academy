import { NotFoundException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityStatus } from '@lms-organization/shared-types';
import mongoose from 'mongoose';
import { Course } from '../../../src/course/entities/course.entity';
import { CourseContent } from '../../../src/course/entities/course-content.entity';
import { ContentType } from '../../../src/course/enum/contentType.enum';
import { CourseContentService } from '../../../src/course/services/courseContent.service';
import { FileService } from '../../../src/file/file.service';
import { Organization } from '../../../src/organization/entities/organization.entity';
import { SubscriptionService } from '../../../src/subscription/services/subscription.service';
import { TranscriptionService } from '../../../src/transcription/transcription.service';
import { NOT_DELETED_CONTENT_FILTER } from '../../../src/course/utils/not-deleted-content.filter';

describe('CourseContentService.deleteContents (soft delete)', () => {
  const contentId = new mongoose.Types.ObjectId();
  const moduleId = new mongoose.Types.ObjectId();
  const organizationId = new mongoose.Types.ObjectId();
  const deletedBy = new mongoose.Types.ObjectId();

  const session = {
    startTransaction: jest.fn(function (this: { inTransaction: jest.Mock }) {
      this.inTransaction.mockReturnValue(true);
    }),
    commitTransaction: jest.fn(function (this: { inTransaction: jest.Mock }) {
      this.inTransaction.mockReturnValue(false);
    }),
    abortTransaction: jest.fn(function (this: { inTransaction: jest.Mock }) {
      this.inTransaction.mockReturnValue(false);
    }),
    endSession: jest.fn(),
    inTransaction: jest.fn().mockReturnValue(false),
  };

  const leanContents = jest.fn();
  const findSession = jest.fn().mockReturnValue({ lean: leanContents });
  const find = jest.fn().mockReturnValue({ session: findSession });

  const updateManySession = jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
  const updateMany = jest.fn().mockReturnValue({ session: updateManySession });
  const deleteMany = jest.fn();

  const paginate = jest.fn().mockResolvedValue({ docs: [], totalDocs: 0 });

  const aggregateExec = jest.fn();
  const aggregateSession = jest.fn().mockReturnThis();
  const aggregate = jest.fn().mockReturnValue({
    session: aggregateSession,
    exec: aggregateExec,
  });

  const courseContentModel = {
    find,
    updateMany,
    deleteMany,
    paginate,
    aggregate,
  };

  const subscriptionService = {
    decrementUsage: jest.fn().mockResolvedValue(undefined),
  };

  const fileService = {
    deleteFile: jest.fn().mockResolvedValue(undefined),
    getFileUrl: jest.fn(),
  };

  const connection = {
    startSession: jest.fn().mockResolvedValue(session),
  };

  let service: CourseContentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    session.inTransaction.mockReturnValue(false);
    find.mockReturnValue({ session: findSession });
    findSession.mockReturnValue({ lean: leanContents });
    updateMany.mockReturnValue({ session: updateManySession });
    updateManySession.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    connection.startSession.mockResolvedValue(session);

    leanContents.mockResolvedValue([
      {
        _id: contentId,
        moduleId,
        organizationId,
        type: ContentType.ARTICLE,
        title: 'Lesson 1',
      },
    ]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CourseContentService,
        { provide: getModelToken(Course.name), useValue: {} },
        { provide: getModelToken(CourseContent.name), useValue: courseContentModel },
        { provide: getModelToken('CourseModule'), useValue: { aggregate: jest.fn() } },
        { provide: getModelToken(Organization.name), useValue: {} },
        { provide: getConnectionToken(), useValue: connection },
        { provide: FileService, useValue: fileService },
        { provide: SubscriptionService, useValue: subscriptionService },
        { provide: TranscriptionService, useValue: { enqueue: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(CourseContentService);
  });

  it('soft-deletes content with deletedAt and deletedById (does not hard delete)', async () => {
    const before = Date.now();

    await service.deleteContents([contentId.toString()], null, deletedBy.toString());

    const after = Date.now();

    expect(deleteMany).not.toHaveBeenCalled();
    expect(updateMany).toHaveBeenCalledTimes(1);

    const [filter, update] = updateMany.mock.calls[0] as [
      { _id: { $in: mongoose.Types.ObjectId[] } },
      { $set: { deletedAt: Date; deletedById: mongoose.Types.ObjectId | null } },
    ];

    expect(filter._id.$in.map(String)).toEqual([contentId.toString()]);
    expect(update.$set.deletedById?.toString()).toBe(deletedBy.toString());
    expect(update.$set.deletedAt).toBeInstanceOf(Date);
    expect(update.$set.deletedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(update.$set.deletedAt.getTime()).toBeLessThanOrEqual(after);

    expect(session.commitTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
    expect(fileService.deleteFile).not.toHaveBeenCalled();
    expect(subscriptionService.decrementUsage).not.toHaveBeenCalled();
  });

  it('stores null deletedById when the actor is omitted', async () => {
    await service.deleteContents([contentId.toString()]);

    const [, update] = updateMany.mock.calls[0] as [
      unknown,
      { $set: { deletedById: mongoose.Types.ObjectId | null } },
    ];
    expect(update.$set.deletedById).toBeNull();
  });

  it('throws NotFoundException when any content id is missing', async () => {
    leanContents.mockResolvedValueOnce([]);

    await expect(service.deleteContents([contentId.toString()], null, deletedBy.toString())).rejects.toBeInstanceOf(
      NotFoundException
    );

    expect(updateMany).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalled();
  });

  it('listContents always applies the not-deleted filter', async () => {
    await service.listContents({ organizationId });

    expect(paginate).toHaveBeenCalledWith(
      {
        organizationId,
        ...NOT_DELETED_CONTENT_FILTER,
      },
      expect.any(Object)
    );
  });

  it('getContent match stage excludes soft-deleted contents', async () => {
    aggregateExec.mockResolvedValueOnce([
      {
        _id: contentId,
        type: ContentType.ARTICLE,
        title: 'Lesson 1',
      },
    ]);

    await service.getContent(contentId.toString());

    const pipeline = aggregate.mock.calls[0][0] as mongoose.PipelineStage[];
    const matchStage = pipeline[0] as { $match: Record<string, unknown> };

    expect(matchStage.$match).toMatchObject({
      _id: contentId,
      ...NOT_DELETED_CONTENT_FILTER,
    });
  });

  it('getContent throws NotFoundException for soft-deleted / missing content', async () => {
    aggregateExec.mockResolvedValueOnce([]);

    await expect(service.getContent(contentId.toString())).rejects.toBeInstanceOf(NotFoundException);
  });
});
