import { Roles } from '@darnozom/shared-types';

export const routesAfterLogin = (role: Roles) => {
  switch (role) {
    case Roles.STUDENT: {
      return '/student-dashboard';
    }
    case Roles.PARENT: {
      return '/parent-dashboard';
    }
    case Roles.PLATFORM_ADMIN: {
      return '/main-admin-dashboard';
    }
    default: {
      return '/organization-dashboard';
    }
  }
};
