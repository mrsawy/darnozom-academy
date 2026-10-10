import { ReportsSection } from './__components/sections/reports/reports-section';

export default async function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-6 px-4 py-6 md:gap-8 md:py-8 lg:px-6">
      <ReportsSection />
    </div>
  );
}
