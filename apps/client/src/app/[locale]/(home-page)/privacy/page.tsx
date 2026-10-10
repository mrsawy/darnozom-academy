import { setRequestLocale } from 'next-intl/server';
import PrivacyContentSection from './__sections/privacy-content-section';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-background relative min-h-screen w-full">
      <PrivacyContentSection />
    </div>
  );
}
