import { Roles } from '@lms-organization/shared-types';
import {
  ROUTE_ORG_ACCOUNT,
  ROUTE_ORG_BILLING,
  ROUTE_PARENT_ACCOUNT,
  ROUTE_STUDENT_ACCOUNT,
  ROUTE_STUDENT_WALLET,
} from '@/lib/data/constants/routes.constants';

export function getAccountHref(roleName: Roles): string {
  switch (roleName) {
    case Roles.STUDENT: {
      return ROUTE_STUDENT_ACCOUNT;
    }
    case Roles.PARENT: {
      return ROUTE_PARENT_ACCOUNT;
    }
    default: {
      return ROUTE_ORG_ACCOUNT;
    }
  }
}

export function getBillingHref(roleName: Roles): string | null {
  switch (roleName) {
    case Roles.STUDENT: {
      return ROUTE_STUDENT_WALLET;
    }
    case Roles.ADMIN:
    case Roles.SUPER_ADMIN: {
      return ROUTE_ORG_BILLING;
    }
    default: {
      return null;
    }
  }
}
