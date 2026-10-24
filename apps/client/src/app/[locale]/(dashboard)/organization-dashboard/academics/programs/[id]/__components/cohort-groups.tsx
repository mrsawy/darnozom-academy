'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, ChevronLeft, UserRound, Users } from 'lucide-react';
import { GroupStudentStatus } from '@darnozom/shared-types';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/atoms/badge';
import { ROUTE_ORG_ACADEMICS_GROUP } from '@/lib/data/constants/routes.constants';
import { useGroups } from '@/lib/hooks/academics/use-academics.hook';
import { StatusBadge } from '../../../groups/__components/status-badge';
import type { IGroup } from '@/lib/types/academics/academics';

function activeStudentCount(group: IGroup) {
  return group.students.filter((student) => student.status !== GroupStudentStatus.WITHDRAWN).length;
}

export function CohortGroups({ cohortId }: { cohortId: string }) {
  const t = useTranslations('Academics');
  const { data: groups = [], isLoading } = useGroups({ cohortId });

  if (isLoading) {
    return <p className="text-muted-foreground px-1 text-xs">{t('loading')}</p>;
  }

  if (groups.length === 0) {
    return <p className="text-muted-foreground px-1 text-xs">{t('programs.emptyGroupsHint')}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {groups.map((group) => (
        <li key={group._id}>
          <Link
            href={ROUTE_ORG_ACADEMICS_GROUP(group._id)}
            className="bg-background hover:border-primary/40 hover:bg-accent/40 group flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border px-3 py-2 transition-colors">
            <span className="group-hover:text-primary min-w-0 flex-1 truncate text-sm font-medium transition-colors">
              {group.name}
            </span>

            {group.atRisk ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                {t('tasks.atRisk')}
              </Badge>
            ) : null}

            <StatusBadge status={group.status} />

            <span className="text-muted-foreground flex items-center gap-1 text-xs tabular-nums">
              <Users className="size-3.5" />
              {`${activeStudentCount(group)}/${group.maxStudents}`}
            </span>

            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <UserRound className="size-3.5" />
              {group.teacherId ? t('groups.teacher') : t('groups.noTeacher')}
            </span>

            <ChevronLeft className="text-muted-foreground size-4 shrink-0 rtl:rotate-180" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
