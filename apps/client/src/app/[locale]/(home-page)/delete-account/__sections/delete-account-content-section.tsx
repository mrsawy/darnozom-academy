import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  ACCOUNT_DELETION_SUPPORT_EMAIL,
  ROUTE_CONTACT,
  URL_ACCOUNT_DELETION_SUPPORT_MAILTO,
} from '@/lib/data/constants/routes.constants';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import LegalBlock from '@/components/molecules/public-site/legal-block';

const BLOCK_KEYS = ['deleted', 'retained', 'timeline', 'inApp'] as const;

export default async function DeleteAccountContentSection() {
  const t = await getTranslations('HomeLegal.deleteAccount');

  return (
    <section className="bg-dz-paper text-dz-ink mx-auto w-full max-w-4xl px-6 py-20">
      <DisplayHeading as="h1">{t('title')}</DisplayHeading>
      <p className="text-dz-ink-soft mt-4 mb-8 text-base">{t('intro')}</p>

      <div className="mb-10 flex flex-wrap gap-3">
        <a
          href={URL_ACCOUNT_DELETION_SUPPORT_MAILTO}
          className="bg-dz-terracotta text-dz-paper-raised hover:bg-dz-terracotta-deep inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors">
          {t('requestCta')}
        </a>
        <Link
          href={ROUTE_CONTACT}
          className="border-dz-line-strong text-dz-ink hover:border-dz-ink inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors">
          {t('contactCta')}
        </Link>
      </div>

      <div className="flex flex-col gap-5">
        <LegalBlock title={t('blocks.howTo.title')}>
          {t('blocks.howTo.description', { email: ACCOUNT_DELETION_SUPPORT_EMAIL })}
        </LegalBlock>

        {BLOCK_KEYS.map((key) => (
          <LegalBlock key={key} title={t(`blocks.${key}.title`)}>
            {t(`blocks.${key}.description`)}
          </LegalBlock>
        ))}
      </div>
    </section>
  );
}
