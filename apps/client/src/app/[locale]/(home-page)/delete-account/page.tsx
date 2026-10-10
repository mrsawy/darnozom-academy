import { setRequestLocale } from 'next-intl/server';
import DeleteAccountContentSection from './__sections/delete-account-content-section';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export default async function DeleteAccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-background relative min-h-screen w-full">
      <DeleteAccountContentSection />
    </div>
  );
}
