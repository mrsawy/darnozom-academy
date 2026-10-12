'use client';

import { useTranslations } from 'next-intl';
import { IconCircleCheck, IconCircleDashed } from '@tabler/icons-react';
import { GroupStatus, ReadinessKey, type Readiness } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { Switch } from '@/components/atoms/switch';

interface ReadinessPanelProps {
  readiness: Readiness;
  status: GroupStatus;
  contentSent: boolean;
  disabled: boolean;
  onToggleContentSent: (done: boolean) => void;
  onMarkReady: () => void;
}

export function ReadinessPanel({
  readiness,
  status,
  contentSent,
  disabled,
  onToggleContentSent,
  onMarkReady,
}: ReadinessPanelProps) {
  const t = useTranslations('Academics');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('readiness.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {readiness.items.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              {item.done ? (
                <IconCircleCheck className="h-5 w-5 text-green-600" />
              ) : (
                <IconCircleDashed className="text-muted-foreground h-5 w-5" />
              )}
              <span>{t(`readiness.items.${item.key}`)}</span>
              {item.key === ReadinessKey.CONTENT_SENT ? (
                <Switch
                  className="ms-auto"
                  checked={contentSent}
                  disabled={disabled}
                  onCheckedChange={(checked) => onToggleContentSent(checked)}
                  aria-label={t('readiness.contentSentToggle')}
                />
              ) : null}
            </li>
          ))}
        </ul>
        {status === GroupStatus.FORMING ? (
          <div className="space-y-2">
            {readiness.ready ? null : (
              <p className="text-muted-foreground text-sm">{t('readiness.notReadyHint')}</p>
            )}
            <Button disabled={disabled || !readiness.ready} onClick={onMarkReady}>
              {t('readiness.markReady')}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
