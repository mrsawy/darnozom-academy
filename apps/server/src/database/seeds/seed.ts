import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { ORGANIZATIONS_CONFIG } from './seed.config';
import path from 'node:path';
import { getMongoUri, getCliEnvFlag, MONGO_CONNECTION_OPTIONS } from '../../config/mongo.config';
import { extractDatabaseName, redactUri } from './prod-preflight';
import { Role, RoleSchema } from '../../role/entities/role.entity';
import { Plan, PlanSchema } from '../../plan/entities/plan.entity';
import { User, UserSchema } from '../../user/entities/user.entity';
import { Wallet, WalletSchema } from '../../wallet/entities/wallet.entity';
import { Organization, OrganizationSchema } from '../../organization/entities/organization.entity';
import { Category, CategorySchema } from '../../category/entities/category.entity';
import { Course, CourseSchema } from '../../course/entities/course.entity';
import { Grade, GradeSchema } from '../../grade/entities/grade.entity';
import { SchoolType, SchoolTypeSchema } from '../../school-type/entities/school-type.entity';
import { CourseModuleEntity, CourseModuleSchema } from '../../course/entities/course-module.entity';
import { CourseContent, CourseContentSchema } from '../../course/entities/course-content.entity';
import { ContentType } from '../../course/enum/contentType.enum';
import { VideoSchema } from '../../course/entities/video.schema';
import { ArticleSchema } from '../../course/entities/article.schema';
import { QuizSchema } from '../../course/entities/quiz.schema';
import { AssignmentSchema } from '../../course/entities/assignment.schema';
import { ProjectSchema } from '../../course/entities/project.schema';
import { LiveSessionSchema } from '../../course/entities/liveSession.schema';
import { AttachmentSchema } from '../../course/entities/attachment.schema';
import { Enrollment, EnrollmentSchema } from '../../enrollment/entities/enrollment.entity';
import { Attendance, AttendanceSchema } from '../../attendance/entities/attendance.entity';
import { Review, ReviewSchema } from '../../review/entities/review.entity';
import { CourseReviewSchema } from '../../review/entities/course-review.entity';
import { InstructorReviewSchema } from '../../review/entities/instructor-review.entity';
import { OrganizationReviewSchema } from '../../review/entities/organization-review.entity';
import { ModuleReviewSchema } from '../../review/entities/module-review.entity';
import { ContentReviewSchema } from '../../review/entities/content-review.entity';
import { ReviewType } from '../../review/enum/reviewType.enum';
import { Subscription, SubscriptionSchema } from '../../subscription/entities/subscription.entity';
import { Wishlist, WishlistSchema } from '../../wishlist/entities/wishlist.entity';
import { AiPlan, AiPlanSchema } from '../../ai-plan/entities/ai-plan.entity';
import { AiSubscription, AiSubscriptionSchema } from '../../ai-subscription/entities/ai-subscription.entity';
import { Transaction, TransactionSchema } from '../../transaction/entities/transaction.entity';
import { PrivateSession, PrivateSessionSchema } from '../../private-session/entities/private-session.entity';
import { SessionBooking, SessionBookingSchema } from '../../private-session/entities/session-booking.entity';
import { WithdrawalRequest, WithdrawalRequestSchema } from '../../withdrawal-request/entities/withdrawal-request.entity';
import { Notification, NotificationSchema } from '../../notification/entities/notification.entity';
import { AiThread, AiThreadSchema } from '../../ai/entities/ai-thread.entity';
import { Conversation, ConversationSchema } from '../../chat/entities/conversation.entity';
import { ChatMessage, ChatMessageSchema } from '../../chat/entities/chat-message.entity';
import { BillingCycle } from '../../utils/enums/billingCycle.enum';
import { SubscriptionStatus } from '../../utils/enums/subscriptionStatus.enum';
import { PlanTier } from '../../plan/enum/planTier.enum';
import { Roles, UserStatus } from '@lms-organization/shared-types';

import { CurrencyService } from '../../currency/currency.service';
import { RoleSeeder } from '../../role/seeds/role.seeder';
import { PlanSeeder } from '../../plan/seeds/plan.seeder';
import { AiPlanSeeder } from '../../ai-plan/seeds/ai-plan.seeder';
import { AiSubscriptionSeeder } from '../../ai-subscription/seeds/ai-subscription.seeder';
import { TransactionSeeder } from '../../transaction/seeds/transaction.seeder';
import { UserSeeder } from '../../user/seeds/user.seeder';
import { OrganizationSeeder } from '../../organization/seeds/organization.seeder';
import { CourseSeeder } from '../../course/seeds/course.seeder';
import { EnrollmentSeeder } from '../../enrollment/seeds/enrollment.seeder';
import { CategorySeeder } from '../../category/seeds/category.seeder';
import { WishlistSeeder } from '../../wishlist/seeds/wishlist.seeder';
import { ReviewSeeder } from '../../review/seeds/review.seeder';
import { PrivateSessionSeeder } from '../../private-session/seeds/private-session.seeder';
import { WithdrawalRequestSeeder } from '../../withdrawal-request/seeds/withdrawal-request.seeder';
import { NotificationSeeder } from '../../notification/seeds/notification.seeder';
import { AiThreadSeeder } from '../../ai/seeds/ai-thread.seeder';
import { ChatSeeder } from '../../chat/seeds/chat.seeder';
import { GradeSeeder } from '../../grade/seeds/grade.seeder';
import { SchoolTypeSeeder } from '../../school-type/seeds/school-type.seeder';
import { fakerAR as faker } from '@faker-js/faker';
import { Connection, Types, Model, ConnectionStates } from 'mongoose';
import { configDotenv } from 'dotenv';

// Ensure apps/server/.env is loaded before reading flags and DB config
// eslint-disable-next-line unicorn/prefer-module -- Nest CommonJS build; __dirname locates apps/server/.env
configDotenv({ path: path.resolve(__dirname, '../../../.env') });
configDotenv();

const targetEnv = getCliEnvFlag();
if (targetEnv === 'prod') {
  process.env.NODE_ENV = 'production';
} else if (targetEnv === 'dev') {
  process.env.NODE_ENV = 'development';
}

const log = (msg: string) => console.log(msg); // eslint-disable-line no-console

function billingCycleForTier(tier: PlanTier): BillingCycle {
  switch (tier) {
    case PlanTier.ENTERPRISE: {
      return BillingCycle.YEARLY;
    }
    case PlanTier.PRO: {
      return BillingCycle.MONTHLY;
    }
    default: {
      return BillingCycle.ONE_TIME;
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(getMongoUri(), MONGO_CONNECTION_OPTIONS),
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Plan.name, schema: PlanSchema },
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Grade.name, schema: GradeSchema },
      { name: SchoolType.name, schema: SchoolTypeSchema },
      { name: Course.name, schema: CourseSchema },
      { name: 'CourseModule', schema: CourseModuleSchema },
      {
        name: CourseContent.name,
        schema: CourseContentSchema,
        discriminators: [
          { name: ContentType.VIDEO, schema: VideoSchema },
          { name: ContentType.ARTICLE, schema: ArticleSchema },
          { name: ContentType.QUIZ, schema: QuizSchema },
          { name: ContentType.ASSIGNMENT, schema: AssignmentSchema },
          { name: ContentType.PROJECT, schema: ProjectSchema },
          { name: ContentType.LIVE_SESSION, schema: LiveSessionSchema },
          { name: ContentType.ATTACHMENT, schema: AttachmentSchema },
        ],
      },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      {
        name: Review.name,
        schema: ReviewSchema,
        discriminators: [
          { name: ReviewType.COURSE, schema: CourseReviewSchema },
          { name: ReviewType.INSTRUCTOR, schema: InstructorReviewSchema },
          { name: ReviewType.ORGANIZATION, schema: OrganizationReviewSchema },
          { name: ReviewType.MODULE, schema: ModuleReviewSchema },
          { name: ReviewType.CONTENT, schema: ContentReviewSchema },
        ],
      },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Wishlist.name, schema: WishlistSchema },
      { name: AiPlan.name, schema: AiPlanSchema },
      { name: AiSubscription.name, schema: AiSubscriptionSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: PrivateSession.name, schema: PrivateSessionSchema },
      { name: SessionBooking.name, schema: SessionBookingSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AiThread.name, schema: AiThreadSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  providers: [CurrencyService],
})
class SeedModule {}

async function bootstrap() {
  process.env.DISABLE_REALTIME = 'true';

  const uri = getMongoUri();
  const database = extractDatabaseName(uri);
  const effectiveEnv = targetEnv ?? (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');

  log(`Dev seed [${effectiveEnv}] — target database: ${database}`);
  log(`  ${redactUri(uri)}`);
  log('Starting seed bootstrap...');
  const app = await NestFactory.createApplicationContext(SeedModule);
  log('Nest application context created.');

  const connection = app.get<Connection>(getConnectionToken());
  if (connection.readyState !== ConnectionStates.connected) {
    log('Waiting for MongoDB connection...');
    await Promise.race([
      new Promise<void>((resolve) => connection.once('connected', () => resolve())),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('MongoDB connection timeout after 15s')), 15_000)),
    ]);
  }

  log('Cleaning database...');
  for (const collection of Object.values(connection.collections)) {
    await collection.deleteMany({});
  }
  log('Database cleaned.');

  // ─── Resolve models ────────────────────────────────────────────
  const roleModel = app.get<Model<Role>>(getModelToken(Role.name));
  const planModel = app.get<Model<Plan>>(getModelToken(Plan.name));
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const walletModel = app.get<Model<Wallet>>(getModelToken(Wallet.name));
  const organizationModel = app.get<Model<Organization>>(getModelToken(Organization.name));
  const categoryModel = app.get<Model<Category>>(getModelToken(Category.name));
  const gradeModel = app.get<Model<Grade>>(getModelToken(Grade.name));
  const schoolTypeModel = app.get<Model<SchoolType>>(getModelToken(SchoolType.name));
  const courseModel = app.get<Model<Course>>(getModelToken(Course.name));
  const moduleModel = app.get<Model<CourseModuleEntity>>(getModelToken('CourseModule'));
  const contentModel = app.get<Model<CourseContent>>(getModelToken(CourseContent.name));
  const enrollmentModel = app.get<Model<Enrollment>>(getModelToken(Enrollment.name));
  const attendanceModel = app.get<Model<Attendance>>(getModelToken(Attendance.name));
  const reviewModel = app.get<Model<Review>>(getModelToken(Review.name));
  const subscriptionModel = app.get<Model<Subscription>>(getModelToken(Subscription.name));
  const wishlistModel = app.get<Model<Wishlist>>(getModelToken(Wishlist.name));
  const aiPlanModel = app.get<Model<AiPlan>>(getModelToken(AiPlan.name));
  const aiSubscriptionModel = app.get<Model<AiSubscription>>(getModelToken(AiSubscription.name));
  const transactionModel = app.get<Model<Transaction>>(getModelToken(Transaction.name));
  const privateSessionModel = app.get<Model<PrivateSession>>(getModelToken(PrivateSession.name));
  const sessionBookingModel = app.get<Model<SessionBooking>>(getModelToken(SessionBooking.name));
  const withdrawalRequestModel = app.get<Model<WithdrawalRequest>>(getModelToken(WithdrawalRequest.name));
  const notificationModel = app.get<Model<Notification>>(getModelToken(Notification.name));
  const aiThreadModel = app.get<Model<AiThread>>(getModelToken(AiThread.name));
  const conversationModel = app.get<Model<Conversation>>(getModelToken(Conversation.name));
  const chatMessageModel = app.get<Model<ChatMessage>>(getModelToken(ChatMessage.name));

  const currencyService = app.get(CurrencyService);

  // ─── Instantiate seeders ────────────────────────────────────────
  const roleSeeder = new RoleSeeder(roleModel);
  const gradeSeeder = new GradeSeeder(gradeModel);
  const schoolTypeSeeder = new SchoolTypeSeeder(schoolTypeModel);
  const planSeeder = new PlanSeeder(planModel, currencyService);
  const aiPlanSeeder = new AiPlanSeeder(aiPlanModel);
  const aiSubscriptionSeeder = new AiSubscriptionSeeder(aiSubscriptionModel, aiPlanModel);
  const userSeeder = new UserSeeder(userModel, walletModel);
  const orgSeeder = new OrganizationSeeder(organizationModel, enrollmentModel, reviewModel, courseModel);
  const categorySeeder = new CategorySeeder(categoryModel);
  const courseSeeder = new CourseSeeder(courseModel, moduleModel, contentModel, userModel);
  const enrollmentSeeder = new EnrollmentSeeder(enrollmentModel, attendanceModel, courseModel, moduleModel, contentModel, userModel);
  const transactionSeeder = new TransactionSeeder(transactionModel, enrollmentModel);
  const reviewSeeder = new ReviewSeeder(reviewModel, courseModel, enrollmentModel, userModel, organizationModel, moduleModel, contentModel);
  const wishlistSeeder = new WishlistSeeder(wishlistModel, courseModel, userModel, enrollmentModel);
  const privateSessionSeeder = new PrivateSessionSeeder(privateSessionModel, sessionBookingModel);
  const withdrawalRequestSeeder = new WithdrawalRequestSeeder(withdrawalRequestModel, walletModel);
  const notificationSeeder = new NotificationSeeder(notificationModel);
  const aiThreadSeeder = new AiThreadSeeder(aiThreadModel);
  const chatSeeder = new ChatSeeder(conversationModel, chatMessageModel);

  // ─── Phase 1: Global / platform-level data ─────────────────────
  log('Seeding Roles...');
  await roleSeeder.seed();

  log('Seeding Platform Admin...');
  await userSeeder.seedUser({
    username: 'platform-admin',
    email: 'admin@lms-platform.com',
    roleName: Roles.PLATFORM_ADMIN,
    firstName: 'Platform',
    lastName: 'Admin',
  });

  log('Seeding Grades...');
  await gradeSeeder.seed();

  log('Seeding School Types...');
  await schoolTypeSeeder.seed();

  log('Seeding Plans...');
  await planSeeder.seed();

  log('Seeding AI Plans...');
  await aiPlanSeeder.seed();
  await aiSubscriptionSeeder.loadPlans();

  // Grade / SchoolType id pools — assigned randomly to each seeded course so the
  // public catalog has data to filter on. Loaded once and reused across orgs.
  const gradeIds = (await gradeModel.find().select('_id').lean()).map((g) => g._id);
  const schoolTypeIds = (await schoolTypeModel.find().select('_id').lean()).map((s) => s._id);

  // ─── Phase 2: Per-organization data ────────────────────────────
  log('Seeding Organizations and their data...');

  for (const [i, organizationConfig] of ORGANIZATIONS_CONFIG.entries()) {
    log(`\nSeeding Org [${i + 1}/${ORGANIZATIONS_CONFIG.length}]: ${organizationConfig.name}...`);

    // ── 2a. Resolve plan ─────────────────────────────────────────
    const targetTier = organizationConfig.planTier ?? PlanTier.FREE;
    const plan = await planModel.findOne({ tier: targetTier }).exec();
    if (!plan) throw new Error(`Plan with tier ${targetTier} not found. Ensure plan seeder ran.`);

    const superAdmin = await userSeeder.seedUser({
      username: `superadmin-org-${i}`,
      email: `superadmin${i}@lms-seed.dev`,
      roleName: Roles.SUPER_ADMIN,
    });
    await aiSubscriptionSeeder.seedForSuperAdmin(superAdmin._id, i);

    const org = await orgSeeder.seed(superAdmin._id, plan.name, {
      name: organizationConfig.name,
      entityStatus: organizationConfig.entityStatus,
      emailVerified: organizationConfig.emailVerified,
      verificationStatus: organizationConfig.verificationStatus,
      identityDocumentType: organizationConfig.identityDocumentType,
    });

    superAdmin.organizationId = org._id;
    await superAdmin.save();

    // ── 2b. Subscription (billing cycle varies by plan tier) ─────
    const subscription = await subscriptionModel.create({
      organizationId: org._id,
      planId: plan._id,
      status: SubscriptionStatus.ACTIVE,
      billingCycle: billingCycleForTier(targetTier),
      startsAt: new Date(),
      endsAt: null,
      nextBillingAt: null,
      transactionId: null,
      billing: null,
      reminderDays: 7,
      usage: {
        usersUsed: 0,
        coursesUsed: 0,
        pagesUsed: 0,
        parentUsersUsed: 0,
        storageUsedGB: 0,
        liveSessionsUsed: 0,
        assignmentsUsed: 0,
      },
    });
    await organizationModel.findByIdAndUpdate(org._id, { subscriptionId: subscription._id });

    // ── 2c. Users ────────────────────────────────────────────────
    log(`  Seeding Users for ${organizationConfig.name}...`);

    const admins = await userSeeder.seedMultiple(organizationConfig.adminsCount, {
      organizationId: org._id,
      roleName: Roles.ADMIN,
    });

    const instructors = await userSeeder.seedMultiple(
      organizationConfig.teachersCount,
      { organizationId: org._id, roleName: Roles.INSTRUCTOR },
      { arabicNames: true }
    );

    const students = await userSeeder.seedMultiple(organizationConfig.studentsCount, {
      organizationId: org._id,
      roleName: Roles.STUDENT,
    });

    // AI subscriptions for active students and instructors
    const activeAiUserIds = [...students.map((u) => u._id), ...instructors.map((u) => u._id)];
    await aiSubscriptionSeeder.seedForUsers(activeAiUserIds);

    // Suspended / inactive users + their AI subscriptions
    let suspendedStudents: User[] = [];
    let inactiveInstructors: User[] = [];
    if ((organizationConfig.suspendedUsersCount ?? 0) > 0) {
      const half = Math.ceil(organizationConfig.suspendedUsersCount! / 2);
      suspendedStudents = await userSeeder.seedMultiple(half, {
        organizationId: org._id,
        roleName: Roles.STUDENT,
        status: UserStatus.SUSPENDED,
      });
      const rest = organizationConfig.suspendedUsersCount! - half;
      if (rest > 0) {
        inactiveInstructors = await userSeeder.seedMultiple(rest, {
          organizationId: org._id,
          roleName: Roles.INSTRUCTOR,
          status: UserStatus.INACTIVE,
        });
      }
      const suspendedIds = [...suspendedStudents.map((u) => u._id), ...inactiveInstructors.map((u) => u._id)];
      await aiSubscriptionSeeder.seedForUsers(suspendedIds);
    }

    // Parent accounts
    if ((organizationConfig.parentAccountsCount ?? 0) > 0) {
      await userSeeder.seedMultiple(organizationConfig.parentAccountsCount ?? 0, {
        organizationId: org._id,
        roleName: Roles.PARENT,
      });
    }

    // ── 2d. Categories ───────────────────────────────────────────
    log(`  Seeding Categories for ${organizationConfig.name}...`);
    const categoryNamesSet = new Set<string>();
    for (const course of organizationConfig.courses) {
      for (const catName of course.categories ?? []) categoryNamesSet.add(catName);
    }
    const categoryMap = await categorySeeder.seedCategoriesMap(org._id, [...categoryNamesSet]);

    // ── 2e. Courses ──────────────────────────────────────────────
    log(`  Seeding Courses for ${organizationConfig.name}...`);
    const courses: Course[] = [];
    const instructorCategoryMap = new Map<string, Set<string>>();
    for (const inst of instructors) instructorCategoryMap.set(inst._id.toString(), new Set<string>());

    for (const courseConfig of organizationConfig.courses) {
      const instructor = faker.helpers.arrayElement(instructors);
      const availableCoInstructors = instructors.filter((inst) => inst._id.toString() !== instructor._id.toString());
      const coInstructorsCount = faker.number.int({ min: 0, max: Math.min(2, availableCoInstructors.length) });
      const coInstructors = faker.helpers.arrayElements(availableCoInstructors, coInstructorsCount);
      const coInstructorsIds = coInstructors.map((inst) => inst._id);

      let courseCategoryIds: Types.ObjectId[] = [];
      if (courseConfig.categories && courseConfig.categories.length > 0) {
        courseCategoryIds = courseConfig.categories
          .map((catName) => categoryMap.get(catName)?._id)
          .filter((id): id is Types.ObjectId => id !== undefined);
      }
      if (courseCategoryIds.length === 0) {
        const allCategories = [...categoryMap.values()];
        if (allCategories.length > 0) {
          const selected = faker.helpers.arrayElement(allCategories);
          if (selected?._id instanceof Types.ObjectId) courseCategoryIds = [selected._id];
        }
      }

      for (const catName of courseConfig.categories ?? []) {
        instructorCategoryMap.get(instructor._id.toString())?.add(catName);
        for (const coInst of coInstructors) instructorCategoryMap.get(coInst._id.toString())?.add(catName);
      }

      const course = await courseSeeder.seedCourse(
        org._id,
        instructor._id,
        instructor.username,
        courseCategoryIds,
        {
          name: courseConfig.name,
          isPaid: courseConfig.isPaid,
          approvalStatus: courseConfig.approvalStatus,
          publishStatus: courseConfig.publishStatus,
          entityStatus: courseConfig.entityStatus,
          gradeId: gradeIds.length > 0 ? faker.helpers.arrayElement(gradeIds) : undefined,
          schoolTypeIds:
            schoolTypeIds.length > 0
              ? faker.helpers.arrayElements(schoolTypeIds, faker.number.int({ min: 0, max: Math.min(2, schoolTypeIds.length) }))
              : [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pricing: courseConfig.pricing as any,
        },
        courseConfig.contentTypes,
        coInstructorsIds
      );
      courses.push(course);
    }

    // ── 2f. Assign categories, grades & school types to instructors ──
    // Subjects (categories) come from the courses the instructor teaches; grades and
    // school types are the levels/tracks the instructor covers — assigned as random
    // multi-value subsets so the public catalog has instructor data to filter on.
    log(`  Assigning Categories / Grades / School Types to Instructors for ${organizationConfig.name}...`);
    for (const instructor of instructors) {
      const update: Record<string, Types.ObjectId[]> = {};

      const catNames = instructorCategoryMap.get(instructor._id.toString());
      if (catNames && catNames.size > 0) {
        const categoryIds = [...catNames].map((n) => categoryMap.get(n)?._id).filter((id): id is Types.ObjectId => id !== undefined);
        if (categoryIds.length > 0) update.categoriesIds = categoryIds;
      }

      if (gradeIds.length > 0) {
        const count = faker.number.int({ min: 1, max: Math.min(3, gradeIds.length) });
        update.gradesIds = faker.helpers.arrayElements(gradeIds, count);
      }

      if (schoolTypeIds.length > 0) {
        const count = faker.number.int({ min: 1, max: Math.min(2, schoolTypeIds.length) });
        update.schoolTypesIds = faker.helpers.arrayElements(schoolTypeIds, count);
      }

      if (Object.keys(update).length > 0) {
        await userModel.findByIdAndUpdate(instructor._id, update);
      }
    }

    // ── 2g. Update category stats ────────────────────────────────
    log(`  Updating category stats for ${organizationConfig.name}...`);
    await categorySeeder.recalculateCategoryStats(org._id, courseModel);

    // ── 2h. Enrollments ──────────────────────────────────────────
    log(`  Seeding Enrollments for ${organizationConfig.name}...`);
    await enrollmentSeeder.seedEnrollmentsForStudents(students, courses, org._id, instructors);

    // ── 2h-post. Wire offline slot rosters ───────────────────────
    log(`  Wiring offline slot rosters for ${organizationConfig.name}...`);
    for (const course of courses) {
      const courseDoc = (await courseModel.findById(course._id).lean()) as unknown as Course;
      const slots =
        (courseDoc as { attendanceSettings?: { requireAttendance?: boolean; offlineSchedule?: unknown[] } }).attendanceSettings?.offlineSchedule ??
        [];
      if (slots.length === 0 || !(courseDoc as { attendanceSettings?: { requireAttendance?: boolean } }).attendanceSettings?.requireAttendance)
        continue;

      const enrollments = await enrollmentModel.find({ courseId: course._id, organizationId: org._id }).select('userId').lean();
      const studentIds = enrollments.map((e) => (e as { userId: unknown }).userId);

      await courseModel.findByIdAndUpdate(course._id, {
        'attendanceSettings.offlineSchedule': (slots as Record<string, unknown>[]).map((slot) => ({
          ...slot,
          studentsIds: studentIds,
        })),
      });
    }

    log(`  Seeding course purchase transactions for ${organizationConfig.name}...`);
    await transactionSeeder.seedCoursePurchaseTransactionsForOrganization(org._id);

    // ── 2i. Reviews (course + instructor + organization) ─────────
    log(`  Seeding Reviews for ${organizationConfig.name}...`);
    await reviewSeeder.seedCoursesReviews(courses, students, organizationConfig);
    await reviewSeeder.seedOrganizationReviews(org._id, 5);
    for (const instructor of instructors) {
      await reviewSeeder.seedInstructorReviews(instructor._id, org._id, 3);
    }

    // ── 2k. Wishlists ─────────────────────────────────────────────
    log(`  Seeding Wishlists for ${organizationConfig.name}...`);
    await wishlistSeeder.seedWishlistsForStudents(students, courses);

    // ── 2l. Private sessions & bookings ──────────────────────────
    log(`  Seeding Private Sessions for ${organizationConfig.name}...`);
    await privateSessionSeeder.seedForOrganization(org._id, instructors, students);

    // ── 2m. Withdrawal requests (instructors) ────────────────────
    log(`  Seeding Withdrawal Requests for ${organizationConfig.name}...`);
    const adminUser = admins[0];
    await withdrawalRequestSeeder.seedForInstructors(instructors, adminUser?._id);

    // ── 2n. Notifications ────────────────────────────────────────
    log(`  Seeding Notifications for ${organizationConfig.name}...`);
    await notificationSeeder.seedForUsers([...students, ...instructors]);

    // ── 2o. AI Threads ───────────────────────────────────────────
    log(`  Seeding AI Threads for ${organizationConfig.name}...`);
    await aiThreadSeeder.seedForUsers([...students, ...instructors]);

    // ── 2p. Chat conversations ───────────────────────────────────
    log(`  Seeding Chat for ${organizationConfig.name}...`);
    await chatSeeder.seedForOrganization(students, instructors);

    // ── 2q. Update subscription usage (all 7 fields) ─────────────
    log(`  Updating subscription usage for ${organizationConfig.name}...`);
    const [usersUsed, coursesUsed, liveSessionsUsed, assignmentsUsed, parentUsersUsed] = await Promise.all([
      userModel.countDocuments({ organizationId: org._id }),
      Promise.resolve(courses.length),
      contentModel.countDocuments({ organizationId: org._id, type: ContentType.LIVE_SESSION }),
      contentModel.countDocuments({ organizationId: org._id, type: ContentType.ASSIGNMENT }),
      userModel.countDocuments({ organizationId: org._id, roleName: Roles.PARENT }),
    ]);
    await subscriptionModel.findByIdAndUpdate(subscription._id, {
      $set: {
        'usage.usersUsed': usersUsed,
        'usage.coursesUsed': coursesUsed,
        'usage.pagesUsed': 0,
        'usage.parentUsersUsed': parentUsersUsed,
        'usage.storageUsedGB': 0,
        'usage.liveSessionsUsed': liveSessionsUsed,
        'usage.assignmentsUsed': assignmentsUsed,
      },
    });

    // ── 2r. Organization & instructor stats ───────────────────────
    log(`  Updating organization stats for ${organizationConfig.name}...`);
    await orgSeeder.updateOrganizationStats(org._id, courses.length);

    log(`  Recalculating instructor stats for ${organizationConfig.name}...`);
    await courseSeeder.recalculateAllInstructorTotalCourses(org._id);
    await reviewSeeder.recalculateAllInstructorCourseRatings(org._id);
  }

  log('\nSeeding complete!');
  await app.close();
  // eslint-disable-next-line unicorn/no-process-exit, n/no-process-exit
  process.exit(0);
}

void bootstrap();
