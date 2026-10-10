import { setRequestLocale } from 'next-intl/server';
import TermsContentSection from './__sections/terms-content-section';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-background relative min-h-screen w-full">
      <TermsContentSection />
    </div>
  );
}
