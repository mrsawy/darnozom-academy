'use client';

import { useTranslations } from 'next-intl';
import { GroupStatus } from '@darnozom/shared-types';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  useCancelGroup,
  useGroup,
  useGroupTasks,
  useMarkGroupReady,
  useSetContentSent,
  useStartGroup,
  useUpdateGroup,
} from '@/lib/hooks/academics/use-academics.hook';
import { useAuthUser, useUsersByOrganization } from '@/lib/hooks/user/use-user.hook';
import { withDefaults } from '@/lib/types/Paginated';
import { groupScreenAccess } from '@/lib/utils/academics/group-access';
import { safeHref } from '@/lib/utils/academics/safe-href';
import { GroupForm } from '../../__components/group-form';
import { StatusBadge } from '../../__components/status-badge';
import { CancelGroupDialog } from './cancel-group-dialog';
import { FollowUpsCard } from './follow-ups-card';
import { GroupSessionsCard } from './group-sessions-card';
import { OpenTasksCard } from './open-tasks-card';
import { ReadinessPanel } from './readiness-panel';
import { StaffCard } from './staff-card';
import { StudentsCard } from './students-card';
import { SubscriptionsCard } from './subscriptions-card';
import { TeacherCard } from './teacher-card';

export function GroupFormationScreen({ groupId }: { groupId: string }) {
  const t = useTranslations('Academics');
  const { data: group, isLoading } = useGroup(groupId);
  const { data: user } = useAuthUser();
  const updateGroup = useUpdateGroup();
  const markReady = useMarkGroupReady();
  const startGroup = useStartGroup();
  const cancelGroup = useCancelGroup();
  const setContentSent = useSetContentSent();
  const { data: staffPage } = useUsersByOrganization(withDefaults({ page: 1, limit: 100 }));
  const staffCandidates = (staffPage?.docs ?? []).map((u) => ({
    _id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    roleName: u.roleName as string,
    additionalRoles: (u.additionalRoles ?? []) as string[],
  }));
  const { data: groupTasks = [], isLoading: tasksLoading } = useGroupTasks(groupId);

  if (isLoading || !group) return <p className="p-4">{t('loading')}</p>;
  const { locked, scheduleLocked, canStart, canCancel, canManage } = groupScreenAccess(
    user,
    group.status
  );
  const started = group.status === GroupStatus.RUNNING || group.status === GroupStatus.COMPLETED;
  const missingTotal = !group.totalSessions;

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <StatusBadge status={group.status} />
        </div>
        <div className="flex items-center gap-2">
          {canStart ? (
            <Button
              disabled={startGroup.isPending || missingTotal}
              title={missingTotal ? t('sessions.startMissingTotal') : t('sessions.startHint')}
              onClick={() => startGroup.mutate(group._id)}>
              {t('sessions.start')}
            </Button>
          ) : null}
          {canCancel ? (
            <CancelGroupDialog
              pending={cancelGroup.isPending}
              onConfirm={(reason) => cancelGroup.mutate({ id: group._id, reason })}
            />
          ) : null}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <GroupForm
                key={group._id}
                initial={{
                  name: group.name,
                  schedule: group.schedule,
                  timezone: group.timezone,
                  minStudents: group.minStudents,
                  maxStudents: group.maxStudents,
                  totalSessions: group.totalSessions ?? 12,
                  meetingLink: group.meetingLink ?? null,
                  whatsappGroupLink: group.whatsappGroupLink ?? null,
                }}
                submitLabel={t('save')}
                pending={updateGroup.isPending || locked}
                lockSchedule={scheduleLocked}
                onSubmit={(data) => updateGroup.mutate({ id: group._id, data })}
              />
            </CardContent>
          </Card>
          <StudentsCard group={group} disabled={locked} />
          <SubscriptionsCard group={group} disabled={locked} />
          {started ? <GroupSessionsCard group={group} canManage={canManage} /> : null}
          {started && canManage ? <FollowUpsCard groupId={group._id} /> : null}
        </div>
        <div className="space-y-6">
          {started ? null : (
            <ReadinessPanel
              readiness={group.readiness}
              status={group.status}
              contentSent={group.contentSent.done}
              disabled={locked || markReady.isPending}
              onToggleContentSent={(done) => setContentSent.mutate({ id: group._id, done })}
              onMarkReady={() => markReady.mutate(group._id)}
            />
          )}
          <TeacherCard group={group} disabled={locked || scheduleLocked} />
          <StaffCard
            group={group}
            candidates={staffCandidates}
            onChange={(patch) => updateGroup.mutate({ id: group._id, data: patch })}
          />
          <OpenTasksCard tasks={groupTasks} isLoading={tasksLoading} />
          <Card>
            <CardHeader>
              <CardTitle>{t('form.whatsappGroupLink')}</CardTitle>
            </CardHeader>
            <CardContent>
              {safeHref(group.whatsappGroupLink) ? (
                <a
                  className="break-all underline"
                  href={safeHref(group.whatsappGroupLink)}
                  target="_blank"
                  rel="noreferrer">
                  {group.whatsappGroupLink}
                </a>
              ) : (
                <p className="text-muted-foreground">{t('empty')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
