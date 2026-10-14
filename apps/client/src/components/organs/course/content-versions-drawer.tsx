'use client';

import { useLocale, useTranslations } from 'next-intl';
import { SHARIA_MIGRATED_COMMENT, SHARIA_SUPERSEDED_COMMENT } from '@darnozom/shared-types';
import type { IContentVersion } from '@/lib/types/course/sharia';
import { ShariaStatusBadge } from './sharia-status-badge';

/** SUPERSEDED and MIGRATED are machine markers, not sentences a person should read. */
const commentLabel = (comment: string | null, t: (key: string) => string): string | null => {
  if (!comment) return null;
  if (comment === SHARIA_SUPERSEDED_COMMENT) return t('sharia.superseded');
  if (comment === SHARIA_MIGRATED_COMMENT) return t('sharia.migrated');
  return comment;
};

export function ContentVersionsDrawer({
  versions,
  isLoading,
}: {
  versions: IContentVersion[];
  isLoading: boolean;
}) {
  const t = useTranslations('Sharia');
  const locale = useLocale();
  if (isLoading) return <p>{t('sharia.loading')}</p>;
  if (versions.length === 0) return <p className="text-muted-foreground">{t('sharia.empty')}</p>;

  return (
    <ul className="space-y-3">
      {versions.map((version) => (
        <li key={version._id} className="space-y-1 rounded-md border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{t('sharia.version', { number: version.version })}</span>
            <ShariaStatusBadge status={version.shariaStatus} reviewComment={null} />
          </div>
          <p className="text-muted-foreground text-sm">
            {new Date(version.createdAt).toLocaleString(locale)}
          </p>
          {commentLabel(version.reviewComment, t) ? (
            <p className="text-sm">{commentLabel(version.reviewComment, t)}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
