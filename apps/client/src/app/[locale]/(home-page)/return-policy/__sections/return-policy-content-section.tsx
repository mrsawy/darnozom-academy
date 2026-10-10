import { getTranslations } from 'next-intl/server';
import ReturnPolicyBlock from '../__components/return-policy-block';

export default async function ReturnPolicyContentSection() {
  const t = await getTranslations('HomeLegal.returnPolicy');

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="mb-4 text-4xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground mb-10 text-base">{t('intro')}</p>

      <div className="space-y-6">
        <ReturnPolicyBlock
          title={t('blocks.noRefunds.title')}
          description={t('blocks.noRefunds.description')}
        />
        <ReturnPolicyBlock
          title={t('blocks.immediateAccess.title')}
          description={t('blocks.immediateAccess.description')}
        />
        <ReturnPolicyBlock
          title={t('blocks.subscriptions.title')}
          description={t('blocks.subscriptions.description')}
        />
        <ReturnPolicyBlock
          title={t('blocks.technicalIssues.title')}
          description={t('blocks.technicalIssues.description')}
        />
        <ReturnPolicyBlock
          title={t('blocks.contact.title')}
          description={t('blocks.contact.description')}
        />
      </div>
    </section>
  );
}
