'use client';

import { useTranslations } from 'next-intl';
import { usePathname, Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  ROUTE_ORG_VERIFICATION_EMAIL,
  ROUTE_ORG_VERIFICATION_IDENTITY,
} from '@/lib/data/constants/routes.constants';

export default function VerificationLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Verification');
  const pathname = usePathname();

  const tabs = [
    { label: t('emailTab'), href: ROUTE_ORG_VERIFICATION_EMAIL },
    { label: t('identityTab'), href: ROUTE_ORG_VERIFICATION_IDENTITY },
  ];

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold">{t('title')}</h1>
      <div className="mb-6 flex gap-1 rounded-lg border p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors',
              pathname === tab.href
                ? 'bg-primary text-muted'
                : 'hover:bg-muted text-muted-foreground'
            )}>
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
