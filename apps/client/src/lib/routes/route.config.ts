export const ROUTES = {
  organizationDashboard: {
    courses: {
      base: '/organization-dashboard/courses',
      modules: (courseId: string) => `/organization-dashboard/courses/${courseId}/modules`,
    },
  },
} as const;
