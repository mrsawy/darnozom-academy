import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { Roles } from '@darnozom/shared-types';
import { getAuthUser } from '@/lib/api/get-auth-user';
import { ROUTE_LOGIN } from '@/lib/data/constants/routes.constants';
import { IUser } from '@/types/user/user.interface';
import { getDashboardUrl } from './getDashboardUrl';

/** next-intl's redirect is not typed as `never`, so this keeps control-flow narrowing. */
function localeRedirect(href: string, locale: string): never {
  redirect({ href, locale });
  throw new Error('unreachable');
}

/** Loads the session user and keeps them on a dashboard that matches their role. */
export async function requireDashboardUser(allowed: Roles[]): Promise<IUser> {
  const locale = await getLocale();
  const user = await getAuthUser();
  if (!user) {
    localeRedirect(ROUTE_LOGIN, locale);
  }
  if (!allowed.includes(user.roleName)) {
    localeRedirect(getDashboardUrl(user.roleName), locale);
  }
  return user;
}
