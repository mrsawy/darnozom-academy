import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  ACCOUNT_DELETION_SUPPORT_EMAIL,
  ROUTE_CONTACT,
  URL_ACCOUNT_DELETION_SUPPORT_MAILTO,
} from '@/lib/data/constants/routes.constants';
import DeleteAccountBlock from '../__components/delete-account-block';

export default async function DeleteAccountContentSection() {
  const t = await getTranslations('HomeLegal.deleteAccount');

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="mb-4 text-4xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mb-8 text-base">{t('intro')}</p>

      <div className="mb-10 flex flex-wrap gap-3">
        <a
          href={URL_ACCOUNT_DELETION_SUPPORT_MAILTO}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors">
          {t('requestCta')}
        </a>
        <Link
          href={ROUTE_CONTACT}
          className="border-border bg-background hover:bg-accent inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors">
          {t('contactCta')}
        </Link>
      </div>

      <div className="space-y-6">
        <DeleteAccountBlock
          title={t('blocks.howTo.title')}
          description={t('blocks.howTo.description', { email: ACCOUNT_DELETION_SUPPORT_EMAIL })}
        />
        <DeleteAccountBlock
          title={t('blocks.deleted.title')}
          description={t('blocks.deleted.description')}
        />
        <DeleteAccountBlock
          title={t('blocks.retained.title')}
          description={t('blocks.retained.description')}
        />
        <DeleteAccountBlock
          title={t('blocks.timeline.title')}
          description={t('blocks.timeline.description')}
        />
        <DeleteAccountBlock
          title={t('blocks.inApp.title')}
          description={t('blocks.inApp.description')}
        />
      </div>
    </section>
  );
}
