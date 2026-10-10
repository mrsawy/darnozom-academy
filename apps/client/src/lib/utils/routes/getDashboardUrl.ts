import { Roles } from '@islamic-academy/shared-types';
import {
  ROUTE_ORGANIZATION_DASHBOARD,
  ROUTE_PARENT_DASHBOARD,
  ROUTE_STUDENT_DASHBOARD,
} from '@/lib/data/constants/routes.constants';

export const getDashboardUrl = (role: Roles | undefined) => {
  switch (role) {
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
