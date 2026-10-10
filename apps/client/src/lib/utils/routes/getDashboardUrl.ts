import { Roles } from '@lms-organization/shared-types';
import {
  ROUTE_MAIN_ADMIN_DASHBOARD,
  ROUTE_STUDENT_DASHBOARD,
  ROUTE_PARENT_DASHBOARD,
  ROUTE_ORGANIZATION_DASHBOARD,
} from '@/lib/data/constants/routes.constants';

export const getDashboardUrl = (role: Roles | undefined) => {
  switch (role) {
    case Roles.PLATFORM_ADMIN: {
      return ROUTE_MAIN_ADMIN_DASHBOARD;
    }
    case Roles.STUDENT: {
      return ROUTE_STUDENT_DASHBOARD;
    }
    case Roles.PARENT: {
      return ROUTE_PARENT_DASHBOARD;
    }
    default: {
      return ROUTE_ORGANIZATION_DASHBOARD;
    }
  }
};
