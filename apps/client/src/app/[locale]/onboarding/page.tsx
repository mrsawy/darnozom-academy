import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { OnboardingForm } from './__components/onboarding-form/onboarding-form';
import { OnboardingPageShell } from './__components/onboarding-page-shell';
import { AppleHelloEffectEnglish } from '@/components';
import { getRequestCurrency } from '@/lib/utils/geo/get-request-currency';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return { title: t('onboardingTitle') };
}

export default async function OnboardingPage() {
  const defaultCurrency = await getRequestCurrency();

  return (
    <OnboardingPageShell>
      <div className="flex flex-col items-center justify-center gap-20">
        <AppleHelloEffectEnglish />
        <OnboardingForm defaultCurrency={defaultCurrency} />
      </div>
    </OnboardingPageShell>
  );
}
