'use client';

import { useTranslations } from 'next-intl';

const show = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

/** Only the fields the edit touches, live value beside proposed value. */
export function VersionDiff({
  live,
  pending,
}: {
  live: Record<string, unknown>;
  pending: Record<string, unknown>;
}) {
  const t = useTranslations('Sharia');
  const fields = Object.keys(pending);
  if (fields.length === 0) return <p className="text-muted-foreground">{t('sharia.noChanges')}</p>;

  return (
    <dl className="space-y-3">
      {fields.map((field) => {
        const before = show(live[field]);
        return (
          <div key={field} className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs uppercase">{`${field} — ${t('sharia.live')}`}</dt>
              <dd className="text-sm whitespace-pre-wrap">
                {before === '' ? t('sharia.notSet') : before}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">{`${field} — ${t('sharia.proposed')}`}</dt>
              <dd className="text-sm whitespace-pre-wrap">{show(pending[field])}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
}
