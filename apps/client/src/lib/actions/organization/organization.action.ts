'use server';

import { createAuthorizedNatsRequest } from '@/lib/utils/createNatsRequest';

export interface IOrganizationSettings {
  name: string;
  /** Read-only after creation. */
  slug: string;
  description: string | null;
  logoFileKey: string | null;
  /** 'default' | 'custom' | a tweakcn preset id. */
  themeId: string;
  primaryColor: string;
  secondaryColor: string;
}

export async function getOrganizationSettings() {
  return createAuthorizedNatsRequest<IOrganizationSettings>('organization.settings.get', {});
}

export async function updateOrganizationSettings(data: Partial<IOrganizationSettings>) {
  return createAuthorizedNatsRequest<IOrganizationSettings>('organization.settings.update', data);
}
