import { Model, Types } from 'mongoose';
import { Course } from '../entities/course.entity';
import { CourseModuleEntity } from '../entities/course-module.entity';
import { CourseContent, CourseContentDocument } from '../entities/course-content.entity';
import { fakerAR as faker } from '@faker-js/faker';
import { BillingCycle } from '../../utils/enums/billingCycle.enum';
import { ContentType } from '../enum/contentType.enum';
import { VideoType } from '../enum/videoType.enum';
import { User } from '../../user/entities/user.entity';
import { Video } from '../entities/video.schema';
import { Article } from '../entities/article.schema';
import { Quiz } from '../entities/quiz.schema';
import { Assignment } from '../entities/assignment.schema';
import { Project } from '../entities/project.schema';
import { LiveSession } from '../entities/liveSession.schema';
import { Attachment } from '../entities/attachment.schema';
import { Platform, ApprovalStatus, EntityStatus, PublishStatus, ActiveStatus } from '@lms-organization/shared-types';
import { TranscriptStatus, TranscriptSource } from '../enum/transcriptStatus.enum';

/** A small pool of real video/file keys for variety across courses. */
const THUMBNAIL_KEYS = [
  'public/courses/thumbnails/a1.jpg',
  'public/courses/thumbnails/a2.jpg',
  'public/courses/thumbnails/a3.jpeg',
  'public/courses/thumbnails/a4.webp',
  'public/courses/thumbnails/a5.jpeg',
  'public/courses/thumbnails/a6.jpg',
  'public/courses/thumbnails/a7.jpg',
  'public/courses/thumbnails/a8.jpg',
  'public/courses/thumbnails/a9.jpg',
  'public/courses/thumbnails/a10.jpg',
  'public/courses/thumbnails/a11.webp',
  'public/courses/thumbnails/a12.png',
  'public/courses/thumbnails/a13.jpg',
];

const TRAILER_KEY =
  'public/courses/trailers/--and--E4oqF/019bc9aa-75c3-7147-9e03-7e8477182028_emerging-technology-course-trailer-dordt-university.mp4';

export class CourseSeeder {
  constructor(
    private readonly courseModel: Model<Course>,
    private readonly moduleModel: Model<CourseModuleEntity>,
    private readonly contentModel: Model<CourseContent>,
    private readonly userModel: Model<User>
  ) {}

  async seedCourse(
    organizationId: Types.ObjectId,
    instructorId: Types.ObjectId,
    createdBy: string,
    categoryIds: Types.ObjectId[],
    overrides: Partial<Course> & {
      approvalStatus?: ApprovalStatus;
      publishStatus?: PublishStatus;
      entityStatus?: EntityStatus;
    } = {},
    contentTypes?: ContentType[],
    coInstructorsIds?: Types.ObjectId[]
  ) {
    const { approvalStatus, publishStatus, entityStatus, ...courseOverrides } = overrides;

    const courseId = new Types.ObjectId();
    const isPaid = courseOverrides.isPaid ?? faker.datatype.boolean();
    const courseName = courseOverrides.name ?? faker.commerce.productName();
    const coInstructorsIdsArray = coInstructorsIds ?? [];

    const resolvedApprovalStatus = approvalStatus ?? ApprovalStatus.APPROVED;
    const resolvedPublishStatus = publishStatus ?? PublishStatus.PUBLISHED;
    const resolvedEntityStatus = entityStatus ?? EntityStatus.ACTIVE;

    const isPublished = resolvedPublishStatus === PublishStatus.PUBLISHED;

    const courseData = {
      _id: courseId,
      organizationId,
      name: courseName,
      createdBy,
      categoriesIds: categoryIds,
      isPaid,
      instructorId,
      coInstructorsIds: coInstructorsIdsArray,
      description: faker.lorem.paragraphs(2),
      shortDescription: faker.lorem.sentence(),
      learningObjectives: [faker.lorem.sentence(), faker.lorem.sentence()],
      thumbnailKey: faker.helpers.arrayElement(THUMBNAIL_KEYS),
      trailerKey: TRAILER_KEY,
      approvalStatus: resolvedApprovalStatus,
      publishStatus: resolvedPublishStatus,
      activeStatus: ActiveStatus.ACTIVE,
      status: resolvedEntityStatus,
      pricing: isPaid
        ? {
            [BillingCycle.ONE_TIME]: {
              originalPrice: faker.number.int({ min: 50, max: 200 }),
              priceUSD: faker.number.int({ min: 50, max: 200 }),
              originalCurrency: 'USD',
            },
          }
        : undefined,
      settings: {
        isPublished,
        isDraft: !isPublished,
      },
      attendanceSettings: faker.datatype.boolean({ probability: 0.4 })
        ? {
            requireAttendance: true,
            offlineSchedule: [
              {
                startTime: '09:00 am',
                endTime: '10:30 am',
                dayOfWeek: faker.helpers.arrayElement(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']),
                instructorsIds: [instructorId],
                studentsIds: [],
              },
            ],
          }
        : { requireAttendance: false, offlineSchedule: [] },
      ...courseOverrides,
    };

    const course = await this.courseModel.create(courseData);

    const modulesCount = faker.number.int({ min: 4, max: 6 });
    const moduleIds: Types.ObjectId[] = [];
    const moduleDocs: { _id: Types.ObjectId; contentsIds: Types.ObjectId[] }[] = [];

    for (let i = 0; i < modulesCount; i++) {
      const moduleId = new Types.ObjectId();
      const contentsCount = faker.number.int({ min: 4, max: 7 });
      const contentIds: Types.ObjectId[] = [];

      const availableTypes =
        contentTypes && contentTypes.length > 0
          ? contentTypes
          : [
              ContentType.VIDEO,
              ContentType.ARTICLE,
              ContentType.QUIZ,
              ContentType.ASSIGNMENT,
              ContentType.PROJECT,
              ContentType.LIVE_SESSION,
              ContentType.ATTACHMENT,
            ];

      const typesToUse: ContentType[] = [];
      for (let j = 0; j < contentsCount; j++) {
        typesToUse.push(availableTypes[j % availableTypes.length]);
      }
      const shuffledTypes = [...typesToUse].toSorted(() => 0.5 - Math.random());

      const contentDocs: Partial<CourseContentDocument>[] = [];
      for (let j = 0; j < contentsCount; j++) {
        const type = shuffledTypes[j];
        const contentId = new Types.ObjectId();
        contentIds.push(contentId);

        const contentData: Partial<CourseContentDocument> = {
          _id: contentId,
          courseId: course._id,
          organizationId,
          moduleId,
          createdBy,
          type,
          title: faker.lorem.words(4),
          description: faker.lorem.sentence(),
          approvalStatus: ApprovalStatus.APPROVED,
          publishStatus: PublishStatus.PUBLISHED,
          activeStatus: ActiveStatus.ACTIVE,
          status: resolvedEntityStatus,
        };

        buildContentTypeFields(contentData, type, course._id);
        contentDocs.push(contentData);
      }

      await this.contentModel.insertMany(contentDocs);

      moduleDocs.push({
        _id: moduleId,
        contentsIds: contentIds,
      });
      moduleIds.push(moduleId);
    }

    await this.moduleModel.insertMany(
      moduleDocs.map((m, i) => ({
        _id: m._id,
        courseId: course._id,
        organizationId,
        createdBy,
        title: faker.lorem.words(5),
        description: faker.lorem.sentence(),
        learningObjectives: [faker.lorem.sentence(), faker.lorem.sentence(), faker.lorem.sentence()],
        contentsIds: m.contentsIds,
        approvalStatus: ApprovalStatus.APPROVED,
        publishStatus: PublishStatus.PUBLISHED,
        activeStatus: ActiveStatus.ACTIVE,
        status: resolvedEntityStatus,
        order: i,
      }))
    );

    const updatedCourse = await this.courseModel.findByIdAndUpdate(course._id, { modulesIds: moduleIds }, { new: true });

    await this.updateInstructorTotalCourses(instructorId, coInstructorsIds ?? []);

    return updatedCourse ?? course;
  }

  private async updateInstructorTotalCourses(instructorId: Types.ObjectId, coInstructorsIds: Types.ObjectId[]) {
    const countForUser = async (userId: Types.ObjectId) => {
      return this.courseModel.countDocuments({
        $or: [{ instructorId: userId }, { coInstructorsIds: userId }],
      });
    };

    const instructorCount = await countForUser(instructorId);
    await this.userModel.findByIdAndUpdate(instructorId, { $set: { totalCourses: instructorCount } });

    for (const coId of coInstructorsIds) {
      const count = await countForUser(coId);
      await this.userModel.findByIdAndUpdate(coId, { $set: { totalCourses: count } });
    }
  }

  async recalculateAllInstructorTotalCourses(organizationId: Types.ObjectId) {
    const courses = await this.courseModel.find({ organizationId }).select('instructorId coInstructorsIds').lean();

    const allInstructorIds = new Set<string>();
    const idMap = new Map<string, Types.ObjectId>();

    for (const course of courses) {
      if (course.instructorId) {
        const s = course.instructorId.toString();
        allInstructorIds.add(s);
        idMap.set(s, course.instructorId);
      }
      for (const id of course.coInstructorsIds ?? []) {
        const s = id.toString();
        allInstructorIds.add(s);
        idMap.set(s, id);
      }
    }

    const bulkOps: Parameters<typeof this.userModel.bulkWrite>[0] = [];

    for (const idStr of allInstructorIds) {
      const instructorId = idMap.get(idStr)!;
      const count = await this.courseModel.countDocuments({
        $or: [{ instructorId }, { coInstructorsIds: instructorId }],
      });
      bulkOps.push({
        updateOne: {
          filter: { _id: instructorId },
          update: { $set: { totalCourses: count } },
        },
      });
    }

    if (bulkOps.length > 0) {
      await this.userModel.bulkWrite(bulkOps);
    }
  }
}

/** Arabic mock transcripts for seeded content — gives the AI context demo data. */
const MOCK_TRANSCRIPTS = [
  {
    transcript:
      'في هذا الدرس سنتعلم أساسيات البرمجة الشيئية. أولاً، مفهوم الكلاس وهو نموذج لإنشاء الكائنات. الكائن هو نسخة من الكلاس ويحتوي على بيانات وسلوكيات. التغليف يعني إخفاء تفاصيل التنفيذ. الوراثة تتيح لكلاس جديد أن يرث خصائص كلاس آخر. تعدد الأشكال يسمح باستخدام واجهة موحدة لأنواع مختلفة.',
    summary: 'درس في مبادئ البرمجة الشيئية يشمل الكلاسات والكائنات والتغليف والوراثة وتعدد الأشكال.',
    keyPoints: [
      'الكلاس هو نموذج لإنشاء الكائنات',
      'التغليف يحمي تفاصيل التنفيذ',
      'الوراثة تتيح إعادة استخدام الكود',
      'تعدد الأشكال يوفر مرونة في التصميم',
    ],
    topics: ['البرمجة الشيئية', 'الكلاسات والكائنات', 'الوراثة', 'التغليف'],
  },
  {
    transcript:
      'قواعد البيانات العلائقية تعتمد على الجداول والعلاقات. الجدول يتكون من صفوف وأعمدة. المفتاح الأساسي يُعرّف كل صف بشكل فريد. المفتاح الأجنبي يربط جدولين ببعضهما. SQL هي لغة الاستعلام القياسية. SELECT تسترجع البيانات، INSERT تضيف بيانات جديدة، UPDATE تعدل البيانات، DELETE تحذفها.',
    summary: 'مقدمة في قواعد البيانات العلائقية وأوامر SQL الأساسية.',
    keyPoints: [
      'الجدول هو الوحدة الأساسية لتخزين البيانات',
      'المفتاح الأساسي يضمن تفرد كل سجل',
      'SQL لغة قياسية للتعامل مع قواعد البيانات',
      'العمليات الأساسية: SELECT - INSERT - UPDATE - DELETE',
    ],
    topics: ['قواعد البيانات', 'SQL', 'المفاتيح', 'العلاقات'],
  },
  {
    transcript:
      'خوارزميات الفرز من أهم موضوعات علم الحاسوب. فرز الفقاعات يقارن كل زوج متجاور ويبدّلهما إذا كانا في الترتيب الخطأ. فرز الإدراج يبني الترتيب تدريجياً. فرز الدمج يقسم القائمة إلى نصفين ثم يدمجهما. QuickSort يختار محوراً ويقسم حوله. التعقيد الزمني مهم لاختيار الخوارزمية المناسبة.',
    summary: 'شرح خوارزميات الفرز الشائعة ومقارنة تعقيدها الزمني.',
    keyPoints: [
      'فرز الفقاعات بسيط لكن بطيء O(n²)',
      'فرز الدمج فعال O(n log n)',
      'QuickSort الأكثر استخداماً عملياً',
      'اختيار الخوارزمية يعتمد على حجم البيانات',
    ],
    topics: ['خوارزميات الفرز', 'التعقيد الزمني', 'هياكل البيانات'],
  },
  {
    transcript:
      'الشبكات الحاسوبية تتيح تبادل البيانات بين الأجهزة. نموذج OSI يتكون من سبع طبقات. طبقة التطبيق هي الأقرب للمستخدم. طبقة النقل تضمن وصول البيانات بشكل موثوق باستخدام TCP أو UDP. بروتوكول IP يحدد عناوين الأجهزة. DNS يحوّل أسماء النطاقات إلى عناوين IP.',
    summary: 'مبادئ الشبكات الحاسوبية ونموذج OSI وبروتوكولات الشبكة الأساسية.',
    keyPoints: [
      'نموذج OSI يشرح كيفية عمل الشبكات بسبع طبقات',
      'TCP يضمن وصول البيانات بشكل موثوق',
      'IP يعطي كل جهاز عنواناً فريداً',
      'DNS يترجم أسماء المواقع إلى عناوين',
    ],
    topics: ['الشبكات الحاسوبية', 'نموذج OSI', 'TCP/IP', 'DNS'],
  },
];

function addMockTranscriptData(contentData: Partial<CourseContentDocument>, source: TranscriptSource): void {
  // ~60% of content gets a READY transcript for demo purposes
  if (Math.random() > 0.6) {
    (contentData as Record<string, unknown>).transcriptStatus = TranscriptStatus.PENDING;
    return;
  }
  const mock = faker.helpers.arrayElement(MOCK_TRANSCRIPTS);
  (contentData as Record<string, unknown>).transcriptStatus = TranscriptStatus.READY;
  (contentData as Record<string, unknown>).transcript = mock.transcript;
  (contentData as Record<string, unknown>).transcriptData = {
    summary: mock.summary,
    keyPoints: mock.keyPoints,
    topics: mock.topics,
    language: 'ar',
  };
  (contentData as Record<string, unknown>).transcriptSource = source;
  (contentData as Record<string, unknown>).transcriptedAt = faker.date.recent({ days: 30 });
}

function buildContentTypeFields(contentData: Partial<CourseContentDocument>, type: ContentType, courseId: Types.ObjectId): void {
  switch (type) {
    case ContentType.VIDEO: {
      const videoType = faker.helpers.arrayElement([VideoType.URL, VideoType.UPLOAD]);
      (contentData as Video).videoType = videoType;
      if (videoType === VideoType.URL) {
        const youtubeIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw', 'kJQP7kiw5Fk', '9bZkp7q19f0', 'L_jWHffIx5E', 'fJ9rUzIMcZQ'];
        (contentData as Video).videoUrl = `https://www.youtube.com/watch?v=${faker.helpers.arrayElement(youtubeIds)}`;
        addMockTranscriptData(contentData, TranscriptSource.YT_CAPTIONS_AR);
      } else {
        (contentData as Video).fileKey = 'private/course-materials/teach/851c7e1e-2b66-4d3b-bb6c-2f0553c4f26f.mp4';
        addMockTranscriptData(contentData, TranscriptSource.GROQ_WHISPER);
      }
      break;
    }
    case ContentType.ARTICLE: {
      (contentData as Article).body = faker.lorem.paragraphs(faker.number.int({ min: 3, max: 8 }));
      break;
    }
    case ContentType.QUIZ: {
      const questionsCount = faker.number.int({ min: 3, max: 8 });
      (contentData as Quiz).questions = Array.from({ length: questionsCount }, () => ({
        questionText: faker.lorem.sentence() + '?',
        options: [faker.lorem.sentence(), faker.lorem.sentence(), faker.lorem.sentence(), faker.lorem.sentence()],
        correctOption: faker.number.int({ min: 0, max: 3 }),
      }));
      (contentData as Quiz).maxAttempts = faker.number.int({ min: 1, max: 3 });
      (contentData as Quiz).quizDurationInMinutes = faker.number.int({ min: 15, max: 60 });
      (contentData as Quiz).quizStartDate = faker.date.past();
      (contentData as Quiz).quizEndDate = faker.date.future();
      break;
    }
    case ContentType.ASSIGNMENT: {
      (contentData as Assignment).dueDate = faker.date.future();
      (contentData as Assignment).content = faker.lorem.paragraphs(2);
      (contentData as Assignment).maxPoints = faker.number.int({ min: 50, max: 100 });
      if (faker.datatype.boolean()) {
        (contentData as Assignment).fileKey = `private/courses/${courseId.toString()}/assignments/${faker.string.alphanumeric(16)}.pdf`;
      }
      break;
    }
    case ContentType.PROJECT: {
      const isGroupProject = faker.datatype.boolean();
      (contentData as unknown as Project).dueDate = faker.date.future();
      (contentData as unknown as Project).requirements = faker.lorem.paragraphs(faker.number.int({ min: 2, max: 4 }));
      (contentData as unknown as Project).maxPoints = faker.number.int({ min: 100, max: 200 });
      (contentData as unknown as Project).isGroupProject = isGroupProject;
      if (isGroupProject) {
        (contentData as unknown as Project).maxGroupSize = faker.number.int({ min: 2, max: 5 });
      }
      (contentData as unknown as Project).description = faker.lorem.paragraph();
      (contentData as unknown as Project).deliverables = Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, () => faker.lorem.sentence());
      break;
    }
    case ContentType.LIVE_SESSION: {
      const startDate = faker.date.future();
      const durationMinutes = faker.number.int({ min: 30, max: 120 });
      const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
      const platforms = ['ZOOM', 'GOOGLE_MEET', 'MICROSOFT_TEAMS', 'OTHER'] as const;
      (contentData as unknown as LiveSession).startDate = startDate;
      (contentData as unknown as LiveSession).endDate = endDate;
      (contentData as unknown as LiveSession).meetingUrl = faker.internet.url();
      (contentData as unknown as LiveSession).meetingId = faker.string.alphanumeric(10);
      (contentData as unknown as LiveSession).meetingPassword = faker.datatype.boolean() ? faker.string.alphanumeric(8) : undefined;
      (contentData as unknown as LiveSession).platform = faker.helpers.arrayElement(platforms) as Platform;
      (contentData as unknown as LiveSession).durationInMinutes = durationMinutes;
      (contentData as unknown as LiveSession).description = faker.lorem.paragraph();
      if (faker.datatype.boolean()) {
        (contentData as unknown as LiveSession).recordingUrl = faker.internet.url();
      }
      break;
    }
    case ContentType.ATTACHMENT: {
      const mimeType = faker.helpers.arrayElement(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const);
      (contentData as unknown as Attachment).fileKey = 'private/course-materials/Moaddi_Roadmap_v2.pdf';
      (contentData as unknown as Attachment).fileSizeBytes = faker.number.int({ min: 50_000, max: 8_000_000 });
      (contentData as unknown as Attachment).mimeType = mimeType;
      const attachmentSource = mimeType.startsWith('image/') ? TranscriptSource.IMAGE_VISION : TranscriptSource.ATTACHMENT_EXTRACT;
      addMockTranscriptData(contentData, attachmentSource);
      break;
    }
  }
}
