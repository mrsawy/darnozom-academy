import { setRequestLocale } from 'next-intl/server';
import ReturnPolicyContentSection from './__sections/return-policy-content-section';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export default async function ReturnPolicyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-dz-paper text-dz-ink relative min-h-screen w-full">
      <ReturnPolicyContentSection />
    </div>
  );
}
