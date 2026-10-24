import { setRequestLocale } from 'next-intl/server';
import HeroSection from './__sections/hero-section';
import AudienceSection from './__sections/audience-section';
import AcademicStructureSection from './__sections/academic-structure-section';
import AiAssistantSection from './__sections/ai-assistant-section';
import StudentAppShowcase from './__sections/student-app-section/student-app-showcase';
import ParentsAttendanceSection from './__sections/parents-attendance-section';
import PlatformCapabilitiesSection from './__sections/platform-capabilities-section';
import PricingSection from './__sections/pricing';
import CoursesSection from './__sections/course-section';
import TeachersSection from './__sections/teacher-section/teacher-section';
import HomeCtaSection from './__sections/home-cta-section';

// Force dynamic rendering - prevents pre-rendering during other page builds
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-dz-paper text-dz-ink relative min-h-screen w-full">
      <HeroSection />
      <AudienceSection />
      <AcademicStructureSection />
      <StudentAppShowcase />
      <AiAssistantSection />
      <ParentsAttendanceSection />
      <PlatformCapabilitiesSection />
      <CoursesSection />
      <TeachersSection />
      <PricingSection />
      <HomeCtaSection />
    </div>
  );
}
