import { Roles } from '@islamic-academy/shared-types';
import { ROUTE_ORGANIZATION_DASHBOARD } from '@/lib/data/constants/routes.constants';

/**
 * All roles currently land on the same organization dashboard shell; this
 * indirection exists so future role-specific dashboards (e.g. a dedicated
 * student portal) can be introduced without touching call sites.
 */
export const getDashboardUrl = (role: Roles | undefined) => {
  switch (role) {
    default: {
      return ROUTE_ORGANIZATION_DASHBOARD;
    }
  }
};
