import { getTranslations } from 'next-intl/server';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import LegalBlock from '@/components/molecules/public-site/legal-block';

const BLOCK_KEYS = ['account', 'billing', 'content', 'acceptableUse', 'updates'] as const;

export default async function TermsContentSection() {
  const t = await getTranslations('HomeLegal.terms');

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
      </div>
    </section>
  );
}
