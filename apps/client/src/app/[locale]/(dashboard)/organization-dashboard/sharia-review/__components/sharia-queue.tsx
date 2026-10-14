'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';
import type { IShariaQueueItem } from '@/lib/types/course/sharia';

export function ShariaQueue({
  items,
  isLoading,
  onApprove,
  onReject,
}: {
  items: IShariaQueueItem[];
  isLoading: boolean;
  onApprove: (vars: { contentId: string; version: number }) => void;
  onReject: (vars: { contentId: string; version: number; comment: string }) => void;
}) {
  const t = useTranslations('Sharia');
  const locale = useLocale();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<Record<string, boolean>>({});

  if (isLoading) return <p>{t('sharia.loading')}</p>;
  if (items.length === 0) return <p className="text-muted-foreground">{t('sharia.empty')}</p>;

  const reject = (item: IShariaQueueItem) => {
    const key = `${item.contentId}:${item.version}`;
    const comment = (comments[key] ?? '').trim();
    // A rejection with no comment tells the author nothing, so the button refuses to fire.
    if (!comment) {
      setMissing((prev) => ({ ...prev, [key]: true }));
      return;
    }
    setMissing((prev) => ({ ...prev, [key]: false }));
    onReject({ contentId: item.contentId, version: item.version, comment });
  };

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const key = `${item.contentId}:${item.version}`;
        return (
          <li key={key} className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{item.contentTitle}</span>
              <Badge variant="outline">
                {item.isEdit ? t('sharia.kind.edit') : t('sharia.kind.new')}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('sharia.submitted', {
                date: item.createdAt ? new Date(item.createdAt).toLocaleString(locale) : '',
              })}
            </p>
            <Textarea
              aria-label={t('sharia.commentLabel')}
              value={comments[key] ?? ''}
              onChange={(event) => setComments((prev) => ({ ...prev, [key]: event.target.value }))}
            />
            {missing[key] ? (
              <p className="text-destructive text-sm">{t('sharia.commentRequired')}</p>
            ) : null}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onApprove({ contentId: item.contentId, version: item.version })}>
                {t('sharia.approve')}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => reject(item)}>
                {t('sharia.reject')}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
