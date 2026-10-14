'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GroupStatus } from '@darnozom/shared-types';
import { Link } from '@/i18n/navigation';
import { Checkbox } from '@/components/atoms/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/atoms/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/atoms/table';
import { ROUTE_ORG_ACADEMICS_GROUP } from '@/lib/data/constants/routes.constants';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';
import { StatusBadge } from './status-badge';

const ALL = 'ALL';

export function GroupsManager() {
  const t = useTranslations('Academics');
  const cohortId = useSearchParams().get('cohortId') ?? undefined;
  const [status, setStatus] = useState<string>(ALL);
  const [atRisk, setAtRisk] = useState(false);
  const { data: groups = [], isLoading } = useGroups({
    cohortId,
    status: status === ALL ? undefined : (status as GroupStatus),
    atRisk: atRisk || undefined,
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('groups.title')}</h1>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={atRisk} onCheckedChange={(value) => setAtRisk(value === true)} />
          {t('tasks.atRisk')}
        </label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48" aria-label={t('groups.status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('groups.allStatuses')}</SelectItem>
            {Object.values(GroupStatus).map((value) => (
              <SelectItem key={value} value={value}>
                {t(`groups.statuses.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <p>{t('loading')}</p> : null}
      {!isLoading && groups.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : null}
      {groups.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('groups.status')}</TableHead>
              <TableHead>{t('groups.readiness')}</TableHead>
              <TableHead>{t('groups.students')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group._id}>
                <TableCell>
                  <Link
                    href={ROUTE_ORG_ACADEMICS_GROUP(group._id)}
                    className="font-medium hover:underline">
                    {group.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={group.status} />
                </TableCell>
                <TableCell>{`${group.readiness.items.filter((item) => item.done).length}/${group.readiness.items.length}`}</TableCell>
                <TableCell>{`${group.students.length}/${group.maxStudents}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
