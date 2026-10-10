export const ROUTE_HOME = '/';
export const ROUTE_LOGIN = '/login';
export const ROUTE_SIGNUP = '/signup';
/** OAuth redirect from Google (locale-prefixed in app router). */
export const ROUTE_OAUTH_CALLBACK = '/oauth/callback';
/** Post-Google-OAuth profile & role completion. */
export const ROUTE_ONBOARDING = '/onboarding';
export const ROUTE_FORGOT_PASSWORD = '/forgot-password';
export const ROUTE_RESET_PASSWORD = '/reset-password';

export const ROUTE_ORGANIZATION_DASHBOARD = '/organization-dashboard';
export const ROUTE_ORG_ACCOUNT = '/organization-dashboard/account';
export const ROUTE_ORG_USERS = '/organization-dashboard/users';
export const ROUTE_ORG_SETTINGS = '/organization-dashboard/settings';

export const ROUTE_STUDENT_DASHBOARD = '/student-dashboard';
export const ROUTE_STUDENT_ACCOUNT = '/student-dashboard/account';

export const ROUTE_PARENT_DASHBOARD = '/parent-dashboard';
export const ROUTE_PARENT_ACCOUNT = '/parent-dashboard/account';
export const ROUTE_PARENT_CHILDREN = '/parent-dashboard/children';

/** Standalone gate shown to pending/rejected orgs; blocks the dashboard until an admin approves. */
export const ROUTE_ORGANIZATION_VERIFICATION = '/organization-verification';

/** Books Store (Medusa-powered) */
export const ROUTE_BOOKS = '/books';
export const ROUTE_CART = '/cart';
export const ROUTE_CHECKOUT = '/checkout';
export const ROUTE_CHECKOUT_SUCCESS = '/checkout/success';
