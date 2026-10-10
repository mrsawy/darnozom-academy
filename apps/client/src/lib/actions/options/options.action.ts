'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

export enum PlatformOptionKeys {
  PLATFORM_NAME = 'PLATFORM_NAME',
  PLATFORM_EMAIL = 'PLATFORM_EMAIL',
  PLATFORM_SUPPORT_EMAIL = 'PLATFORM_SUPPORT_EMAIL',
  PLATFORM_LOGO_URL = 'PLATFORM_LOGO_URL',
  PLATFORM_TERMS_URL = 'PLATFORM_TERMS_URL',
  PLATFORM_PRIVACY_URL = 'PLATFORM_PRIVACY_URL',
  PLATFORM_WEBSITE_URL = 'PLATFORM_WEBSITE_URL',
  PLATFORM_PHONE = 'PLATFORM_PHONE',
}

export interface OptionResponse {
  _id: string;
  key: string;
  value: unknown;
  organizationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformOptionsMap {
  [PlatformOptionKeys.PLATFORM_NAME]?: string;
  [PlatformOptionKeys.PLATFORM_EMAIL]?: string;
  [PlatformOptionKeys.PLATFORM_SUPPORT_EMAIL]?: string;
  [PlatformOptionKeys.PLATFORM_LOGO_URL]?: string;
  [PlatformOptionKeys.PLATFORM_TERMS_URL]?: string;
  [PlatformOptionKeys.PLATFORM_PRIVACY_URL]?: string;
  [PlatformOptionKeys.PLATFORM_WEBSITE_URL]?: string;
  [PlatformOptionKeys.PLATFORM_PHONE]?: string;
}

export async function getPlatformOptions() {
  return createAuthorizedNatsRequest<OptionResponse[]>('options.findPlatformOptions', {});
}

export async function upsertPlatformOption(key: string, value: unknown) {
  return createAuthorizedNatsRequest<OptionResponse>('options.upsert', { key, value });
}

export async function deletePlatformOption(id: string) {
  return createAuthorizedNatsRequest<void>('options.delete', { id });
}
