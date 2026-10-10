import { PublicHeader } from '@/components/layout/public-header';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Darnozom Academy. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
