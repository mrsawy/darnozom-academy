import { AccessType } from '@lms-organization/shared-types';

/** NATS payload for report dashboard endpoints */
export interface ReportsParams {
  dateFrom?: string;
  dateTo?: string;
  accessTypes?: AccessType[];
  courseIds?: string[];
}

export type ReportDatePreset = '7d' | '30d' | '3m' | '1y' | 'all';

export interface ReportsFilters {
  preset: ReportDatePreset;
  accessType: 'all' | 'free' | 'paid';
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resolveReportsParams(filters: ReportsFilters): ReportsParams {
  const now = Date.now();
  let dateFrom: string | undefined;
  switch (filters.preset) {
    case '7d': {
      dateFrom = new Date(now - 7 * MS_PER_DAY).toISOString();
      break;
    }
    case '30d': {
      dateFrom = new Date(now - 30 * MS_PER_DAY).toISOString();
      break;
    }
    case '3m': {
      dateFrom = new Date(now - 90 * MS_PER_DAY).toISOString();
      break;
    }
    case '1y': {
      dateFrom = new Date(now - 365 * MS_PER_DAY).toISOString();
      break;
    }
    default: {
      dateFrom = undefined;
      break;
    }
  }

  let accessTypes: AccessType[] | undefined;
  if (filters.accessType === 'free') {
    accessTypes = [AccessType.FREE];
  } else if (filters.accessType === 'paid') {
    accessTypes = [AccessType.PAID_ONCE, AccessType.SUBSCRIPTION, AccessType.BY_ORGANIZATION];
  }

  return {
    ...(dateFrom ? { dateFrom } : {}),
    ...(accessTypes?.length ? { accessTypes } : {}),
  };
}
