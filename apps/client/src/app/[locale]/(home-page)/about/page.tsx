import { setRequestLocale } from 'next-intl/server';
import AboutHeroSection from './__sections/hero-section';
import AboutCompaniesSection from './__sections/companies-section';
import AboutStatisticsSection from './__sections/statistics-section';
import AboutMissionSection from './__sections/mission-section';
import AboutTestimonialsSection from './__sections/testimonials-section';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-dz-paper text-dz-ink relative min-h-screen w-full">
      <AboutHeroSection />
      <AboutCompaniesSection />
      <AboutStatisticsSection />
      <AboutMissionSection />
      {/* <AboutGallerySection /> */}
      <AboutTestimonialsSection />
    </div>
  );
}
