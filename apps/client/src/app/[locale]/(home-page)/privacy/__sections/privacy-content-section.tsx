import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ROUTE_DELETE_ACCOUNT } from '@/lib/data/constants/routes.constants';
import PrivacyBlock from '../__components/privacy-block';

export default async function PrivacyContentSection() {
  const t = await getTranslations('HomeLegal.privacy');

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="mb-4 text-4xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mb-10 text-base">{t('intro')}</p>

      <div className="space-y-6">
        <PrivacyBlock
          title={t('blocks.collect.title')}
          description={t('blocks.collect.description')}
        />
        <PrivacyBlock title={t('blocks.use.title')} description={t('blocks.use.description')} />
        <PrivacyBlock
          title={t('blocks.retention.title')}
          description={t('blocks.retention.description')}
        />
        <article className="bg-card rounded-xl border p-6">
          <h2 className="mb-2 text-xl font-medium">{t('blocks.choices.title')}</h2>
          <p className="text-muted-foreground leading-7">
            {t('blocks.choices.description')}{' '}
            <Link href={ROUTE_DELETE_ACCOUNT} className="text-primary underline underline-offset-4">
              {t('blocks.choices.deleteAccountLink')}
            </Link>
            .
          </p>
        </article>
      </div>
    </section>
  );
}
