'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { TeacherPayModel } from '@darnozom/shared-types';
import { formatPayrollAmount } from '@/lib/utils/payroll/format-payroll';
import type { ITeacherPayProfile } from '@/lib/types/payroll/payroll';

export interface PayProfilesTableProps {
  profiles: ITeacherPayProfile[];
  isLoading?: boolean;
  onEditProfile: (profile: ITeacherPayProfile) => void;
}

export function PayProfilesTable({
  profiles,
  isLoading,
  onEditProfile,
}: PayProfilesTableProps) {
  const t = useTranslations('Payroll');
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t('loading')}</p>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground text-sm">{t('emptyProfiles')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('teacher')}</TableHead>
            <TableHead>{t('payModel')}</TableHead>
            <TableHead>{t('rate')}</TableHead>
            <TableHead>{t('effectiveFrom')}</TableHead>
            <TableHead className="text-end">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => {
            const isRevenueShare = profile.model === TeacherPayModel.REVENUE_SHARE;
            const formattedRate = isRevenueShare
              ? `${profile.rate}%`
              : formatPayrollAmount(profile.rate, profile.currency, locale);

            return (
              <TableRow key={profile._id}>
                <TableCell className="font-mono text-sm">
                  {profile.teacherId}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {t(`models.${profile.model}`)}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">
                  {formattedRate}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(profile.effectiveFrom).toLocaleDateString(locale)}
                </TableCell>
                <TableCell className="text-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditProfile(profile)}
                  >
                    {t('editProfile')}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
