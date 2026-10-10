import { getTranslations } from 'next-intl/server';
import TermsBlock from '../__components/terms-block';

export default async function TermsContentSection() {
  const t = await getTranslations('HomeLegal.terms');

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="mb-4 text-4xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mb-10 text-base">{t('intro')}</p>

      <div className="space-y-6">
        <TermsBlock
          title={t('blocks.account.title')}
          description={t('blocks.account.description')}
        />
        <TermsBlock
          title={t('blocks.billing.title')}
          description={t('blocks.billing.description')}
        />
        <TermsBlock
          title={t('blocks.content.title')}
          description={t('blocks.content.description')}
        />
        <TermsBlock
          title={t('blocks.acceptableUse.title')}
          description={t('blocks.acceptableUse.description')}
        />
        <TermsBlock
          title={t('blocks.updates.title')}
          description={t('blocks.updates.description')}
        />
      </div>
    </section>
  );
}
