'use client';

export function SiteHeader({ title }: { title: string }) {
  return (
    <header className="flex h-14 items-center border-b px-6">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
    </header>
  );
}
