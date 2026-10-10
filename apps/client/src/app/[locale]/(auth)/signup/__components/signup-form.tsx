'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Roles } from '@islamic-academy/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api/axios';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import { ROUTE_LOGIN, ROUTE_ORGANIZATION_VERIFICATION } from '@/lib/data/constants/routes.constants';
import { UserMainRoles } from '@/lib/data/userRole.enum';
import { IUser } from '@/types/user/user.interface';
import { RegisterRequestBody } from '@/types/auth/auth.type';

/**
 * Public signup. Organization maps to SUPER_ADMIN + organizationDto on the server;
 * students and parents register without an organization and land on their own dashboards.
 */
export function SignupForm() {
  const t = useTranslations('auth.signup');
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleName: UserMainRoles.STUDENT,
    organizationName: '',
    organizationSlug: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOrg = form.roleName === UserMainRoles.ORGANIZATION;

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isOrg && (!form.organizationName.trim() || !form.organizationSlug.trim())) {
      setError(t('validation.orgRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const body: RegisterRequestBody = {
        userDto: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          username: form.username,
          password: form.password,
          roleName: isOrg
            ? Roles.SUPER_ADMIN
            : form.roleName === UserMainRoles.PARENT
              ? Roles.PARENT
              : Roles.STUDENT,
        },
        ...(isOrg
          ? {
              organizationDto: {
                name: form.organizationName,
                slug: form.organizationSlug,
              },
              acceptedTerms: true,
            }
          : {}),
      };
      const { data } = await api.post<IUser>('/auth/register', body);

      if (data.roleName === Roles.SUPER_ADMIN) {
        router.push(ROUTE_ORGANIZATION_VERIFICATION);
      } else {
        router.push(getDashboardUrl(data.roleName));
      }
    } catch {
      setError(t('validation.somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-lg font-bold sm:text-2xl">{t('title')}</h1>
            <p className="text-sm text-muted-foreground text-balance">{t('subtitle')}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="roleName">{t('roleLabel')}</Label>
            <select
              id="roleName"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.roleName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, roleName: e.target.value as UserMainRoles }))
              }>
              {Object.values(UserMainRoles).map((role) => (
                <option key={role} value={role}>
                  {t(`roles.${role}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">{t('firstNameLabel')}</Label>
              <Input id="firstName" value={form.firstName} onChange={update('firstName')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">{t('lastNameLabel')}</Label>
              <Input id="lastName" value={form.lastName} onChange={update('lastName')} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="username">{t('usernameLabel')}</Label>
            <Input id="username" dir="ltr" value={form.username} onChange={update('username')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <Input id="email" type="email" dir="ltr" value={form.email} onChange={update('email')} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t('passwordLabel')}</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={update('password')}
            />
          </div>

          {isOrg ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="organizationName">{t('organizationNameLabel')}</Label>
                <Input
                  id="organizationName"
                  value={form.organizationName}
                  onChange={update('organizationName')}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="organizationSlug">{t('organizationSlugLabel')}</Label>
                <Input
                  id="organizationSlug"
                  dir="ltr"
                  value={form.organizationSlug}
                  onChange={update('organizationSlug')}
                />
              </div>
            </>
          ) : null}

          {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>

          <div className="text-center text-sm">
            {t('haveAccount')}{' '}
            <Link href={ROUTE_LOGIN} className="underline underline-offset-4 hover:text-primary">
              {t('signIn')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
