import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignupForm } from '../__components/signup-form';
import ClearAuthState from '../__components/clear-auth-state';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('signupTitle') };
}

export default function SignupPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-2 md:p-10">
      <ClearAuthState />
      <div className="w-full max-w-sm md:max-w-7xl">
        <SignupForm />
      </div>
    </div>
  );
}
