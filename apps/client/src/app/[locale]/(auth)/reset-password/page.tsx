import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ResetPasswordForm, InvalidResetLink } from '../__components/reset-password-form';
import { ROUTE_FORGOT_PASSWORD } from '@/lib/data/constants/routes.constants';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('resetPasswordTitle') };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    redirect(ROUTE_FORGOT_PASSWORD);
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-2 md:p-10">
      <div className="w-full max-w-sm md:max-w-xl">
        {token && email ? <ResetPasswordForm token={token} email={email} /> : <InvalidResetLink />}
      </div>
    </div>
  );
}
