import { redirect } from 'next/navigation';
import { Roles } from '@lms-organization/shared-types';
import { getAuthUser } from '@/lib/actions/user/user.action';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';
import { OrganizationVerificationWizard } from './__components/organization-verification-wizard';

export const dynamic = 'force-dynamic';

export default async function OrganizationVerificationPage() {
  const user = await getAuthUser();

  if (!user) redirect(ROUTE_LOGIN);
  // Only organization super-admins use this gate; send everyone else home.
  if (user.roleName !== Roles.SUPER_ADMIN) redirect(getDashboardUrl(user.roleName));

  return <OrganizationVerificationWizard />;
}
