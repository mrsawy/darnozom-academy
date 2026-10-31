'use client';

import { useTranslations } from 'next-intl';
import { GroupStatus } from '@darnozom/shared-types';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/atoms/badge';
import type { IGroup } from '@/lib/types/academics/academics';
import { ROUTE_STUDENT_MY_GROUP } from '@/lib/data/constants/routes.constants';
import { safeHref } from '@/lib/utils/academics/safe-href';

const STATUS_VARIANT: Record<GroupStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [GroupStatus.FORMING]: 'secondary',
  [GroupStatus.READY_TO_START]: 'default',
  [GroupStatus.RUNNING]: 'default',
  [GroupStatus.COMPLETED]: 'secondary',
  [GroupStatus.CANCELLED]: 'destructive',
};

export function GroupSummaryList({ groups }: { groups: IGroup[] }) {
  const t = useTranslations('Academics');

  if (groups.length === 0) {
    return <p className="text-muted-foreground">{t('childGroups.empty')}</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const scheduleText = group.schedule
          .map((slot) => `${t(`days.${slot.dayOfWeek}`)} ${slot.startTime} (${slot.durationMinutes}′)`)
          .join(' · ');
        const studentCount = group.students.length;
        const meetingHref = safeHref(group.meetingLink);
        const whatsappHref = safeHref(group.whatsappGroupLink);

        return (
          <li key={group._id}>
            <Link
              href={ROUTE_STUDENT_MY_GROUP(group._id)}
              className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-base font-semibold leading-snug group-hover:text-primary">
                  {group.name}
                </span>
                <Badge variant={STATUS_VARIANT[group.status]} className="shrink-0 text-xs">
                  {t(`groups.statuses.${group.status}`)}
                </Badge>
              </div>

              {/* Schedule */}
              {scheduleText ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {scheduleText}
                </p>
              ) : null}

              {/* Timezone */}
              <p className="text-muted-foreground/70 text-xs">{group.timezone}</p>

              {/* Stats row */}
              <div className="mt-auto flex flex-wrap gap-3 border-t pt-3 text-sm">
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">{t('groups.students')}</span>
                  <span className="font-medium">
                    {studentCount}/{group.maxStudents}
                  </span>
                </span>
                {group.totalSessions != null ? (
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">{t('form.totalSessions')}</span>
                    <span className="font-medium">{group.totalSessions}</span>
                  </span>
                ) : null}
              </div>

              {/* Action links */}
              {(meetingHref || whatsappHref) ? (
                <div className="flex flex-wrap gap-3 text-sm">
                  {meetingHref ? (
                    <a
                      href={meetingHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary underline-offset-2 hover:underline">
                      {t('form.meetingLink')}
                    </a>
                  ) : null}
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary underline-offset-2 hover:underline">
                      {t('form.whatsappGroupLink')}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
