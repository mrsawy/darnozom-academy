import { setRequestLocale } from 'next-intl/server';
import ContactFormSection from './__sections/contact-form-section';
import ContactMapSection from './__sections/map-section';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-background relative min-h-screen w-full">
      <ContactFormSection />
      {/* <ContactInfoSection /> */}
      <ContactMapSection />
    </div>
  );
}
