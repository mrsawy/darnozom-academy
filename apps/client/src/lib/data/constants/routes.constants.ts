export const ROUTE_HOME = '/';
export const ROUTE_LOGIN = '/login';
export const ROUTE_SIGNUP = '/signup';
/** OAuth redirect from Google (locale-prefixed in app router). */
export const ROUTE_OAUTH_CALLBACK = '/oauth/callback';
/** Post–Google OAuth profile & role completion. */
export const ROUTE_ONBOARDING = '/onboarding';
export const ROUTE_FORGOT_PASSWORD = '/forgot-password';
export const ROUTE_RESET_PASSWORD = '/reset-password';
export const ROUTE_COURSES = '/courses';
export const ROUTE_INSTRUCTORS = '/instructors';
export const ROUTE_INSTRUCTOR_DETAIL = (instructorId: string) => `/instructors/${instructorId}`;
export const ROUTE_ABOUT = '/about';
export const ROUTE_CONTACT = '/contact';
export const ROUTE_PRICING = '/pricing';
export const ROUTE_PRIVACY = '/privacy';
export const ROUTE_TERMS = '/terms';
export const ROUTE_RETURN_POLICY = '/return-policy';
/** Google Play / App Store account & data deletion request page. */
export const ROUTE_DELETE_ACCOUNT = '/delete-account';
export const ACCOUNT_DELETION_SUPPORT_EMAIL = 'info@darnozomlms.com';
export const URL_ACCOUNT_DELETION_SUPPORT_MAILTO = `mailto:${ACCOUNT_DELETION_SUPPORT_EMAIL}?subject=${encodeURIComponent('Account Deletion Request')}`;
export const ROUTE_COURSE_DETAILS = (courseId: string) => `/courses/${courseId}`;
export const ROUTE_STUDENT_DASHBOARD = '/student-dashboard';
export const ROUTE_PARENT_DASHBOARD = '/parent-dashboard';
export const ROUTE_ORGANIZATION_DASHBOARD = '/organization-dashboard';

export const ROUTE_STUDENT_COURSES = '/student-dashboard/courses';
export const ROUTE_STUDENT_COURSE = (enrollmentId: string) =>
  `/student-dashboard/courses/${enrollmentId}`;
export const ROUTE_STUDENT_COURSE_CONTENT = (enrollmentId: string, contentId: string) =>
  `/student-dashboard/courses/${enrollmentId}/${contentId}`;
export const ROUTE_STUDENT_WALLET = '/student-dashboard/wallet';
export const ROUTE_WALLET_CHARGE = '/wallet/charge';
export const ROUTE_ORG_WALLET = '/organization-dashboard/wallet';
export const ROUTE_ORG_BILLING = '/organization-dashboard/settings/plan';

export const ROUTE_STUDENT_ACCOUNT = '/student-dashboard/account';
export const ROUTE_PARENT_ACCOUNT = '/parent-dashboard/account';
export const ROUTE_ORG_ACCOUNT = '/organization-dashboard/account';
export const ROUTE_ORG_USERS = '/organization-dashboard/users';
export const ROUTE_ORG_USERS_CREATE = '/organization-dashboard/users/create';
export const ROUTE_ORG_COURSES = '/organization-dashboard/courses';
export const ROUTE_ORG_COURSES_CREATE = '/organization-dashboard/courses/create';
export const ROUTE_ORG_CONTENT = '/organization-dashboard/content';
export const ROUTE_ORG_CONTENT_BY_TYPE = (contentType: string) =>
  `/organization-dashboard/content/${contentType}`;
export const ROUTE_ORG_COURSE_MODULE_CONTENT_EDIT = (
  courseId: string,
  moduleId: string,
  contentId: string
) => `/organization-dashboard/courses/${courseId}/modules/${moduleId}/content/${contentId}/edit`;
export const ROUTE_ORG_COURSE_MODULE_CONTENT_ADD_NEW = (courseId: string, moduleId: string) =>
  `/organization-dashboard/courses/${courseId}/modules/${moduleId}/content/add-new`;
export const ROUTE_ORG_LIVE_CALL = (courseId: string, moduleId: string, contentId: string) =>
  `/organization-dashboard/courses/${courseId}/modules/${moduleId}/content/${contentId}/live-call`;
export const ROUTE_ORG_COURSE_DETAILS = (courseId: string) =>
  `/organization-dashboard/courses/${courseId}`;
export const ROUTE_ORG_COURSE_MODULES = (courseId: string) =>
  `/organization-dashboard/courses/${courseId}/modules`;
export const ROUTE_ORG_COURSE_MODULE = (courseId: string, moduleId: string) =>
  `/organization-dashboard/courses/${courseId}/modules/${moduleId}`;
export const ROUTE_ORG_COURSE_MODULE_CONTENTS = (courseId: string, moduleId: string) =>
  `/organization-dashboard/courses/${courseId}/modules/${moduleId}/content`;
export const ROUTE_ORG_CATEGORIES = '/organization-dashboard/categories';
export const ROUTE_ORG_ALL_CATEGORIES = '/organization-dashboard/categories/all';
export const ROUTE_ORG_ENROLLMENTS = '/organization-dashboard/enrollments';
export const ROUTE_ORG_GALLERY = '/organization-dashboard/gallery';
export const ROUTE_ORG_MY_PAGES = '/organization-dashboard/my-pages';
export const ROUTE_ORG_MY_PAGE_EDIT = (slug: string) => `${ROUTE_ORG_MY_PAGES}/${slug}/edit`;
export const ROUTE_ORG_ATTENDANCE = '/organization-dashboard/attendance';
export const ROUTE_ORG_SETTINGS = '/organization-dashboard/settings';
export const ROUTE_ORG_SETTINGS_USAGE = '/organization-dashboard/settings/usage';
export const ROUTE_MAIN_ADMIN_DASHBOARD = '/main-admin-dashboard';
export const ROUTE_MAIN_ADMIN_CATEGORIES = '/main-admin-dashboard/categories';
export const ROUTE_MAIN_ADMIN_CATEGORIES_REVIEW = '/main-admin-dashboard/categories/review';
export const ROUTE_MAIN_ADMIN_COURSES = '/main-admin-dashboard/courses';
export const ROUTE_MAIN_ADMIN_COURSES_REVIEW = '/main-admin-dashboard/courses/review';
export const ROUTE_MAIN_ADMIN_MODULES = '/main-admin-dashboard/modules';
export const ROUTE_MAIN_ADMIN_CONTENT = '/main-admin-dashboard/content';
export const ROUTE_MAIN_ADMIN_ORGANIZATIONS = '/main-admin-dashboard/organizations';
export const ROUTE_MAIN_ADMIN_ORGANIZATION_DETAIL = (orgId: string) =>
  `/main-admin-dashboard/organizations/${orgId}`;
export const ROUTE_MAIN_ADMIN_ORG_COURSE_MODULES = (orgId: string, courseId: string) =>
  `/main-admin-dashboard/organizations/${orgId}/courses/${courseId}`;
export const ROUTE_MAIN_ADMIN_ORG_MODULE_CONTENTS = (
  orgId: string,
  courseId: string,
  moduleId: string
) => `/main-admin-dashboard/organizations/${orgId}/courses/${courseId}/modules/${moduleId}`;
export const ROUTE_MAIN_ADMIN_VERIFICATIONS = '/main-admin-dashboard/verifications';
export const ROUTE_MAIN_ADMIN_PLANS = '/main-admin-dashboard/plans';
export const ROUTE_MAIN_ADMIN_AI_PLANS = '/main-admin-dashboard/ai-plans/plans';
export const ROUTE_MAIN_ADMIN_AI_SUBSCRIPTIONS = '/main-admin-dashboard/ai-plans/subscriptions';
export const ROUTE_MAIN_ADMIN_PLATFORM_OPTIONS = '/main-admin-dashboard/platform-options';
export const ROUTE_MAIN_ADMIN_WITHDRAWAL_REQUESTS = '/main-admin-dashboard/withdrawal-requests';
export const ROUTE_MAIN_ADMIN_ROLES = '/main-admin-dashboard/roles';
export const ROUTE_MAIN_ADMIN_GRADES = '/main-admin-dashboard/grades';
export const ROUTE_MAIN_ADMIN_SCHOOL_TYPES = '/main-admin-dashboard/school-types';

export const ROUTE_ORG_VERIFICATION = '/organization-dashboard/verification';
export const ROUTE_ORG_VERIFICATION_EMAIL = '/organization-dashboard/verification/email';
export const ROUTE_ORG_VERIFICATION_IDENTITY = '/organization-dashboard/verification/identity';

/** Standalone gate shown to pending/rejected orgs; blocks the dashboard until an admin approves. */
export const ROUTE_ORGANIZATION_VERIFICATION = '/organization-verification';

export const ROUTE_ORG_PRIVATE_SESSIONS = '/organization-dashboard/private-sessions';
export const ROUTE_ORG_PRIVATE_SESSION_CREATE = '/organization-dashboard/private-sessions/create';
export const ROUTE_ORG_PRIVATE_SESSION_DETAIL = (id: string) =>
  `/organization-dashboard/private-sessions/${id}`;
export const ROUTE_ORG_PRIVATE_SESSION_EDIT = (id: string) =>
  `/organization-dashboard/private-sessions/${id}/edit`;
export const ROUTE_STUDENT_BOOKINGS = '/student-dashboard/bookings';
export const ROUTE_STUDENT_AI_ASSISTANT = '/student-dashboard/ai-assistant';

/** Agora in-app call page for course live sessions. */
export const ROUTE_STUDENT_LIVE_CALL = (enrollmentId: string, contentId: string) =>
  `/student-dashboard/courses/${enrollmentId}/${contentId}/live-call`;

/** Agora in-app call page for private-session bookings. */
export const ROUTE_STUDENT_BOOKING_CALL = (bookingId: string) =>
  `/student-dashboard/bookings/${bookingId}/call`;

export const ROUTE_AI_PRICING = '/ai-pricing';
export const ROUTE_ORG_AI_BILLING = '/organization-dashboard/settings/ai-plan';
export const ROUTE_ORG_CHAT = '/organization-dashboard/chat';
export const ROUTE_STUDENT_AI_SUBSCRIPTION = '/student-dashboard/ai-subscription';
export const ROUTE_PARENT_AI_SUBSCRIPTION = '/parent-dashboard/ai-subscription';

export const ROUTE_CHAT = '/chat';
export const ROUTE_CHAT_CONVERSATION = (conversationId: string) => `/chat/${conversationId}`;
export const ROUTE_CHAT_WITH_USER = (userId: string) => `/chat?with=${userId}`;

export const ROUTE_AI_GENERATE_QUIZ = '/ai/generate-quiz';
export const ROUTE_AI_GENERATE_ARTICLE = '/ai/generate-article';
export const API_PATH_ATTENDANCE_STUDENT_QR = '/attendance/student/qr';
export const ROUTE_STUDENT_CHECK_IN = '/student-dashboard/check-in';
export const ROUTE_STUDENT_ATTENDANCE_WITH_SCANNER = '/student-dashboard/attendance-with-scanner';
export const ROUTE_STUDENT_ATTENDANCE_HISTORY = '/student-dashboard/attendance-history';

/** Books Store (Medusa-powered) */
export const ROUTE_BOOKS = '/books';
export const ROUTE_CART = '/cart';
export const ROUTE_CHECKOUT = '/checkout';
export const ROUTE_CHECKOUT_SUCCESS = '/checkout/success';

export const URL_FACEBOOK = 'https://www.facebook.com/darnozom';
export const URL_INSTAGRAM = 'https://www.instagram.com/darnozomlms';
export const URL_TIKTOK = 'https://www.tiktok.com/@darnozomlms';
export const ROUTE_ORG_ACADEMICS_PROGRAMS = '/organization-dashboard/academics/programs';
export const ROUTE_ORG_ACADEMICS_PROGRAM = (id: string) => `${ROUTE_ORG_ACADEMICS_PROGRAMS}/${id}`;
export const ROUTE_ORG_ACADEMICS_GROUPS = '/organization-dashboard/academics/groups';
export const ROUTE_ORG_ACADEMICS_GROUP = (id: string) => `${ROUTE_ORG_ACADEMICS_GROUPS}/${id}`;
export const ROUTE_ORG_ACADEMICS_GROUP_NEW = (cohortId: string) =>
  `${ROUTE_ORG_ACADEMICS_GROUPS}/new?cohortId=${encodeURIComponent(cohortId)}`;
export const ROUTE_ORG_MY_AVAILABILITY = '/organization-dashboard/my-availability';
export const ROUTE_ORG_MY_GROUPS = '/organization-dashboard/my-groups';
export const ROUTE_STUDENT_MY_GROUPS = '/student-dashboard/my-groups';
export const ROUTE_ORG_MY_SESSIONS = '/organization-dashboard/my-sessions';
export const ROUTE_ORG_MY_TASKS = '/organization-dashboard/my-tasks';
export const ROUTE_ORG_SESSION = (id: string) => `/organization-dashboard/sessions/${id}`;
export const ROUTE_STUDENT_MY_SESSIONS = '/student-dashboard/my-sessions';
