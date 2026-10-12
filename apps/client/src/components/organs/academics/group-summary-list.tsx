'use client';

import { useTranslations } from 'next-intl';
import type { IGroup } from '@/lib/types/academics/academics';

export function GroupSummaryList({ groups }: { groups: IGroup[] }) {
  const t = useTranslations('Academics');
  if (groups.length === 0) return <p className="text-muted-foreground">{t('childGroups.empty')}</p>;
  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <li key={group._id} className="rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{group.name}</span>
            <span className="text-sm">{t(`groups.statuses.${group.status}`)}</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {`${group.schedule.map((slot) => `${t(`days.${slot.dayOfWeek}`)} ${slot.startTime} (${slot.durationMinutes}′)`).join(' · ')} — ${group.timezone}`}
          </p>
          {group.meetingLink ? (
            <a
              className="text-sm underline"
              href={group.meetingLink}
              target="_blank"
              rel="noreferrer">
              {t('form.meetingLink')}
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
