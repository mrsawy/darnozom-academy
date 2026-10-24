import { useTranslations } from 'next-intl';
import SectionShell from '@/components/molecules/public-site/section-shell';
import Eyebrow from '@/components/molecules/public-site/eyebrow';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import { cn } from '@/lib/utils';
import { ANCHOR_HOME_CAPABILITIES } from '@/lib/data/constants/routes.constants';

interface SessionRow {
  student: string;
  slot: string;
  status: string;
}

interface CapabilityItem {
  number: string;
  title: string;
  description: string;
}

/** Index-aligned with `privateSessions.rows`: live, starting soon, booked. */
const STATUS_STYLES = [
  'bg-dz-clay text-dz-paper-raised',
  'bg-dz-sand text-dz-ink',
  'bg-dz-leaf-soft text-dz-leaf-ink',
] as const;

/** The private-sessions feature is the numbered item the panel pulls out. */
const FEATURED_NUMBER = '05';

function PlatformCapabilitiesSection() {
  const t = useTranslations('PlatformCapabilitiesSection');
  const rows = t.raw('privateSessions.rows') as SessionRow[];
  const items = t.raw('items') as CapabilityItem[];

  return (
    <SectionShell
      id={ANCHOR_HOME_CAPABILITIES.slice(1)}
      tone="raised"
      innerClassName="flex flex-col gap-11">
      <div className="flex max-w-[760px] flex-col gap-2.5">
        <Eyebrow>{t('badge')}</Eyebrow>
        <DisplayHeading>{t('title')}</DisplayHeading>
      </div>

      <div className="bg-dz-paper border-dz-line grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-7 rounded-3xl border p-8">
        <div className="flex flex-col gap-3">
          <span className="font-display text-dz-terracotta text-[22px] font-bold">
            {FEATURED_NUMBER}
          </span>
          <DisplayHeading as="h3" scale="card">
            {t('privateSessions.title')}
          </DisplayHeading>
          <p className="text-dz-ink-soft m-0">{t('privateSessions.description')}</p>
          <p className="text-dz-ink-soft m-0 text-sm">
            <strong className="text-dz-ink">{t('whyLabel')}</strong>{' '}
            {t('privateSessions.whyItMatters')}
          </p>
        </div>

        <div className="bg-dz-paper-raised border-dz-line overflow-hidden rounded-2xl border">
          {rows.map((row, index) => (
            <div
              key={row.student}
              className="border-dz-line flex items-center gap-3 border-b px-4.5 py-4 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">{row.student}</div>
                <div className="text-dz-ink-soft text-[13px]">{row.slot}</div>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
                  STATUS_STYLES[index] ?? STATUS_STYLES[2]
                )}>
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-dz-line grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] border-t">
        {items.map((item) => (
          <div
            key={item.number}
            className="border-dz-line flex flex-col gap-2 border-b py-6.5 pe-6">
            <span className="font-display text-dz-terracotta text-xl font-bold">{item.number}</span>
            <div className="text-[17px] font-semibold">{item.title}</div>
            <div className="text-dz-ink-soft text-sm">{item.description}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export default PlatformCapabilitiesSection;
