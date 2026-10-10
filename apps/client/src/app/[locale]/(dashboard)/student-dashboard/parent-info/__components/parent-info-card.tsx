'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { IconUsers } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { PasswordHint } from './password-hint';
import type { ILinkedParentInfo } from '@/lib/types/parent/parent-children.interface';

interface ParentInfoCardProps {
  parent: ILinkedParentInfo;
}

export function ParentInfoCard({ parent }: ParentInfoCardProps) {
  const t = useTranslations('StudentDashboard.parentInfo');

  return (
    <Card className="max-w-md">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="bg-primary/10 rounded-full p-2">
          <IconUsers className="text-primary h-5 w-5" />
        </div>
        <CardTitle className="text-lg">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{t('username')}</p>
          <p className="font-medium">{parent.username}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{t('email')}</p>
          <p className="font-medium">{parent.email}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">{t('passwordStatus')}</p>
          <PasswordHint
            passwordLastUpdated={parent.passwordLastUpdated}
            parentCreatedByStudent={parent.parentCreatedByStudent}
          />
        </div>
      </CardContent>
    </Card>
  );
}
