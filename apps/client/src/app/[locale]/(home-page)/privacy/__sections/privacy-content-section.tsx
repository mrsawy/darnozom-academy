import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ROUTE_DELETE_ACCOUNT } from '@/lib/data/constants/routes.constants';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import LegalBlock from '@/components/molecules/public-site/legal-block';

const BLOCK_KEYS = ['collect', 'use', 'retention'] as const;

export default async function PrivacyContentSection() {
  const t = await getTranslations('HomeLegal.privacy');

  return (
    <section className="bg-dz-paper text-dz-ink mx-auto w-full max-w-4xl px-6 py-20">
      <DisplayHeading as="h1">{t('title')}</DisplayHeading>
      <p className="text-dz-ink-soft mt-4 mb-10 text-base">{t('intro')}</p>

      <div className="flex flex-col gap-5">
        {BLOCK_KEYS.map((key) => (
          <LegalBlock key={key} title={t(`blocks.${key}.title`)}>
            {t(`blocks.${key}.description`)}
          </LegalBlock>
        ))}

        <LegalBlock title={t('blocks.choices.title')}>
          {t('blocks.choices.description')}{' '}
          <Link
            href={ROUTE_DELETE_ACCOUNT}
            className="text-dz-terracotta underline underline-offset-4">
            {t('blocks.choices.deleteAccountLink')}
          </Link>
          .
        </LegalBlock>
      </div>
    </section>
  );
}
