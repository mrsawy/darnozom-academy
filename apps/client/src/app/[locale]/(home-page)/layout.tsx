import { PublicHeader } from '@/components/layout/public-header';

export default function HomePageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
