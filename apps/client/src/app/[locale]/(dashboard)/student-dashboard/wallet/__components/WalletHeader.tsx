import { WalletIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export function WalletHeader() {
  const t = useTranslations('Wallet.header');

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/student-dashboard/courses" className="flex items-center gap-2">
            <WalletIcon className="text-primary h-8 w-8" />
            <span className="text-foreground text-2xl font-bold">{t('title')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
