import { setRequestLocale } from 'next-intl/server';
import AiPricingContentSection from './__sections/ai-pricing-content-section';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AiPricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-background relative min-h-screen w-full">
      <AiPricingContentSection />
    </div>
  );
}
