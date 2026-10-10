import { Model, Types } from 'mongoose';
import { Discussion } from '../entities/discussion.entity';
import { Course } from 'src/course/entities/course.entity';
import { CourseModuleEntity } from 'src/course/entities/course-module.entity';
import { CourseContent } from 'src/course/entities/course-content.entity';
import { User } from 'src/user/entities/user.entity';
import { DiscussionType } from '../enum/discussion-type.enum';
import { fakerAR as faker } from '@faker-js/faker';

interface SeedCourseDiscussionsOptions {
  /** Discussions from seed config (title/content pairs). */
  configDiscussions?: { title: string; content: string }[];
  /** Students/instructors who can author discussions. */
  authors: User[];
}

export class DiscussionSeeder {
  constructor(
    private readonly discussionModel: Model<Discussion>,
    private readonly courseModel: Model<Course>,
    private readonly moduleModel: Model<CourseModuleEntity>,
    private readonly contentModel: Model<CourseContent>
  ) {}

  /**
   * Seeds discussions for a single course:
   * - CourseDiscussion (top-level + replies) from config or random
   * - ModuleDiscussion for each module
   * - ContentDiscussion for selected content items
   */
  async seedForCourse(course: Course, organizationId: Types.ObjectId, options: SeedCourseDiscussionsOptions): Promise<void> {
    const { configDiscussions, authors } = options;
    if (authors.length === 0) return;

    const courseId = course._id;

    const courseDiscussionDocs: Record<string, unknown>[] = [];
    const topLevelIds: Types.ObjectId[] = [];

    // Create top-level CourseDiscussions from config or generate random ones
    const topLevelSources =
      configDiscussions && configDiscussions.length > 0
        ? configDiscussions
        : Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
            title: faker.lorem.sentence(),
            content: faker.lorem.sentences(faker.number.int({ min: 1, max: 3 })),
          }));

    for (const src of topLevelSources) {
      const author = faker.helpers.arrayElement(authors);
      const topId = new Types.ObjectId();
      topLevelIds.push(topId);

      courseDiscussionDocs.push({
        _id: topId,
        type: DiscussionType.COURSE,
        userId: author._id,
        content: src.content,
        parentId: null,
        organizationId,
        courseId,
        likesCount: faker.number.int({ min: 0, max: 20 }),
        repliesCount: 0,
        likedBy: [],
        isEdited: faker.datatype.boolean({ probability: 0.1 }),
      });
    }

    // Add threaded replies to some top-level discussions
    const replyDocs: Record<string, unknown>[] = [];
    for (const parentId of topLevelIds) {
      const replyCount = faker.number.int({ min: 0, max: 3 });
      for (let i = 0; i < replyCount; i++) {
        const author = faker.helpers.arrayElement(authors);
        replyDocs.push({
          _id: new Types.ObjectId(),
          type: DiscussionType.COURSE,
          userId: author._id,
          content: faker.lorem.sentences(faker.number.int({ min: 1, max: 2 })),
          parentId,
          organizationId,
          courseId,
          likesCount: faker.number.int({ min: 0, max: 5 }),
          repliesCount: 0,
          likedBy: [],
          isEdited: false,
        });
      }
    }

    if (courseDiscussionDocs.length > 0) {
      await this.discussionModel.insertMany([...courseDiscussionDocs, ...replyDocs]);
    }

    // Update repliesCount on top-level posts
    for (const parentId of topLevelIds) {
      const count = replyDocs.filter((r) => r.parentId?.toString() === parentId.toString()).length;
      if (count > 0) {
        await this.discussionModel.updateOne({ _id: parentId }, { $set: { repliesCount: count } });
      }
    }

    // Seed ModuleDiscussions
    await this.seedModuleDiscussions(courseId, organizationId, authors);

    // Seed ContentDiscussions
    await this.seedContentDiscussions(courseId, organizationId, authors);
  }

  private async seedModuleDiscussions(courseId: Types.ObjectId, organizationId: Types.ObjectId, authors: User[]): Promise<void> {
    const course = await this.courseModel.findById(courseId).select('modulesIds').lean();
    const modulesIds: Types.ObjectId[] = (course as { modulesIds?: Types.ObjectId[] })?.modulesIds ?? [];
    if (modulesIds.length === 0) return;

    const moduleDocs: Record<string, unknown>[] = [];
    for (const moduleId of modulesIds) {
      const count = faker.number.int({ min: 0, max: 2 });
      for (let i = 0; i < count; i++) {
        const author = faker.helpers.arrayElement(authors);
        moduleDocs.push({
          _id: new Types.ObjectId(),
          type: DiscussionType.MODULE,
          userId: author._id,
          content: faker.lorem.sentences(faker.number.int({ min: 1, max: 2 })),
          parentId: null,
          organizationId,
          courseId,
          moduleId,
          likesCount: faker.number.int({ min: 0, max: 8 }),
          repliesCount: 0,
          likedBy: [],
          isEdited: false,
        });
      }
    }

    if (moduleDocs.length > 0) {
      await this.discussionModel.insertMany(moduleDocs);
    }
  }

  private async seedContentDiscussions(courseId: Types.ObjectId, organizationId: Types.ObjectId, authors: User[]): Promise<void> {
    const course = await this.courseModel.findById(courseId).select('modulesIds').lean();
    const modulesIds: Types.ObjectId[] = (course as { modulesIds?: Types.ObjectId[] })?.modulesIds ?? [];
    if (modulesIds.length === 0) return;

    const contentDocs: Record<string, unknown>[] = [];

    for (const moduleId of modulesIds) {
      const module = await this.moduleModel.findById(moduleId).select('contentsIds').lean();
      const contentsIds: Types.ObjectId[] = (module as { contentsIds?: Types.ObjectId[] })?.contentsIds ?? [];

      // Pick a random subset of content items to add discussions for
      const selected = faker.helpers.arrayElements(contentsIds, {
        min: 0,
        max: Math.min(contentsIds.length, 2),
      });

      for (const contentId of selected) {
        const count = faker.number.int({ min: 0, max: 2 });
        for (let i = 0; i < count; i++) {
          const author = faker.helpers.arrayElement(authors);
          contentDocs.push({
            _id: new Types.ObjectId(),
            type: DiscussionType.CONTENT,
            userId: author._id,
            content: faker.lorem.sentences(faker.number.int({ min: 1, max: 2 })),
            parentId: null,
            organizationId,
            courseId,
            moduleId,
            contentId,
            likesCount: faker.number.int({ min: 0, max: 5 }),
            repliesCount: 0,
            likedBy: [],
            isEdited: false,
          });
        }
      }
    }

    if (contentDocs.length > 0) {
      await this.discussionModel.insertMany(contentDocs);
    }
  }
}
