import { NotFoundException } from '@nestjs/common';
import { AdminReviewOrganizationService } from '../../../src/admin-review/services/admin-review-organization.service';
import { withDeletedQueryOptions } from '../../../src/utils/soft-delete';

function buildService(overrides: {
  courseModel?: unknown;
  contentModel?: unknown;
  moduleModel?: unknown;
  courseService?: unknown;
  courseContentService?: unknown;
  enrollmentService?: unknown;
  userService?: unknown;
  support?: unknown;
}) {
  const unused = {} as never;
  return new AdminReviewOrganizationService(
    unused,
    unused,
    (overrides.courseModel ?? unused) as never,
    (overrides.moduleModel ?? unused) as never,
    (overrides.contentModel ?? unused) as never,
    unused,
    (overrides.courseService ?? unused) as never,
    (overrides.courseContentService ?? unused) as never,
    (overrides.enrollmentService ?? unused) as never,
    (overrides.userService ?? unused) as never,
    unused,
    (overrides.support ?? unused) as never
  );
}

describe('AdminReviewOrganizationService.deleteOrganizationCourse', () => {
  const orgId = 'org-1';
  const courseId = 'course-1';
  const deletedById = 'admin-1';

  const courseModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };
  const courseService = {
    deleteCourses: jest.fn().mockResolvedValue(undefined),
  };
  const courseContentService = {
    deleteContents: jest.fn().mockResolvedValue(undefined),
  };
  const support = {
    organizationIdMatch: jest.fn((id: string) => ({ organizationId: id })),
    extractFileKeys: jest.fn(),
  };

  const service = buildService({
    courseModel,
    courseService,
    courseContentService,
    support,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    courseService.deleteCourses.mockResolvedValue(undefined);
    support.organizationIdMatch.mockImplementation((id: string) => ({ organizationId: id }));
  });

  it('cascades through CourseService.deleteCourses after verifying org membership', async () => {
    courseModel.findOne.mockResolvedValue({ _id: courseId });

    await expect(service.deleteOrganizationCourse(orgId, courseId, deletedById)).resolves.toEqual({ success: true });

    expect(support.organizationIdMatch).toHaveBeenCalledWith(orgId);
    expect(courseModel.findOne).toHaveBeenCalledWith({ _id: courseId, organizationId: orgId });
    expect(courseService.deleteCourses).toHaveBeenCalledWith([courseId], deletedById);
    expect(courseModel.updateOne).not.toHaveBeenCalled();
  });

  it('throws when the course is not in the organization', async () => {
    courseModel.findOne.mockResolvedValue(null);

    await expect(service.deleteOrganizationCourse(orgId, courseId, deletedById)).rejects.toBeInstanceOf(NotFoundException);
    expect(courseService.deleteCourses).not.toHaveBeenCalled();
  });
});

describe('AdminReviewOrganizationService.deleteOrganizationContent', () => {
  const orgId = 'org-1';
  const contentId = 'content-1';
  const deletedById = 'admin-1';

  const contentModel = {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };
  const courseService = {
    deleteCourses: jest.fn(),
  };
  const courseContentService = {
    deleteContents: jest.fn().mockResolvedValue(undefined),
  };
  const support = {
    organizationIdMatch: jest.fn((id: string) => ({ organizationId: id })),
  };

  const service = buildService({
    contentModel,
    courseService,
    courseContentService,
    support,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    courseContentService.deleteContents.mockResolvedValue(undefined);
    support.organizationIdMatch.mockImplementation((id: string) => ({ organizationId: id }));
  });

  it('cascades through CourseContentService.deleteContents', async () => {
    contentModel.findOne.mockResolvedValue({ _id: contentId });

    await expect(service.deleteOrganizationContent(orgId, contentId, deletedById)).resolves.toEqual({ success: true });

    expect(courseContentService.deleteContents).toHaveBeenCalledWith([contentId], null, deletedById);
    expect(contentModel.updateOne).not.toHaveBeenCalled();
  });

  it('throws when content is not in the organization', async () => {
    contentModel.findOne.mockResolvedValue(null);

    await expect(service.deleteOrganizationContent(orgId, contentId, deletedById)).rejects.toBeInstanceOf(NotFoundException);
    expect(courseContentService.deleteContents).not.toHaveBeenCalled();
  });
});

describe('AdminReviewOrganizationService org hierarchy drill-down withDeleted', () => {
  const orgId = '507f1f77bcf86cd799439011';
  const courseId = '507f1f77bcf86cd799439012';
  const moduleId = '507f1f77bcf86cd799439013';

  const setOptions = jest.fn().mockResolvedValue({ _id: courseId });
  const courseModel = {
    findOne: jest.fn().mockReturnValue({ setOptions }),
  };
  const moduleFindSetOptions = jest.fn().mockResolvedValue({ _id: moduleId });
  const moduleModel = {
    findOne: jest.fn().mockReturnValue({ setOptions: moduleFindSetOptions }),
    paginate: jest.fn().mockResolvedValue({ docs: [], totalDocs: 0 }),
  };
  const contentModel = {
    paginate: jest.fn().mockResolvedValue({ docs: [], totalDocs: 0 }),
  };
  const support = {
    organizationIdMatch: jest.fn((id: string) => ({ organizationId: id })),
    buildSearchFilter: jest.fn().mockReturnValue({}),
    extractPaginateOptions: jest.fn().mockReturnValue({ page: 1 }),
  };

  const service = buildService({
    courseModel,
    moduleModel,
    contentModel,
    support,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    support.organizationIdMatch.mockImplementation((id: string) => ({ organizationId: id }));
    support.buildSearchFilter.mockReturnValue({});
    support.extractPaginateOptions.mockReturnValue({ page: 1 });
    courseModel.findOne.mockReturnValue({ setOptions });
    setOptions.mockResolvedValue({ _id: courseId });
    moduleModel.findOne.mockReturnValue({ setOptions: moduleFindSetOptions });
    moduleFindSetOptions.mockResolvedValue({ _id: moduleId });
    moduleModel.paginate.mockResolvedValue({ docs: [], totalDocs: 0 });
    contentModel.paginate.mockResolvedValue({ docs: [], totalDocs: 0 });
  });

  it('getOrganizationCourseModules uses withDeleted for parent course and module list', async () => {
    await service.getOrganizationCourseModules(orgId, courseId, { page: 1 });

    expect(setOptions).toHaveBeenCalledWith(withDeletedQueryOptions());
    expect(moduleModel.paginate).toHaveBeenCalledWith(
      { courseId: expect.anything() },
      expect.objectContaining(withDeletedQueryOptions())
    );
  });

  it('getOrganizationModuleContents uses withDeleted for parent module and content list', async () => {
    await service.getOrganizationModuleContents(orgId, moduleId, { page: 1 });

    expect(moduleFindSetOptions).toHaveBeenCalledWith(withDeletedQueryOptions());
    expect(contentModel.paginate).toHaveBeenCalledWith(
      { moduleId: expect.anything() },
      expect.objectContaining(withDeletedQueryOptions())
    );
  });
});
