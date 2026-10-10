import { setRequestLocale } from 'next-intl/server';
import HeroSection from './__sections/hero-section';
import AudienceSection from './__sections/audience-section';
import AiAssistantSection from './__sections/ai-assistant-section';
import StudentAppShowcase from './__sections/student-app-section/student-app-showcase';
import ParentsAttendanceSection from './__sections/parents-attendance-section';
import PlatformCapabilitiesSection from './__sections/platform-capabilities-section';
import PricingSection from './__sections/pricing';
import CoursesSection from './__sections/course-section';
import TeachersSection from './__sections/teacher-section/teacher-section';

// Force dynamic rendering - prevents pre-rendering during other page builds
export const dynamic = 'force-dynamic';
// Or use 'auto' if you want Next.js to decide
// export const dynamic = 'auto';

// Keep generateStaticParams for production optimization
// export function generateStaticParams() {
//   return routing.locales.map((locale) => ({ locale }));
// }

interface Props {
  params: Promise<{
    locale: string;
  }>;
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-black">
      <HeroSection />
      <AudienceSection />
      <StudentAppShowcase />
      <AiAssistantSection />
      {/*  */}

      {/*  */}
      <ParentsAttendanceSection />
      <PlatformCapabilitiesSection />
      <CoursesSection />
      <TeachersSection />
      <PricingSection />
    </div>
  );
}
