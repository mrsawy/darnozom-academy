'use client';

import { useTranslations } from 'next-intl';
import { safeHref } from '@/lib/utils/academics/safe-href';
import { groupScreenAccess } from '@/lib/utils/academics/group-access';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  useCancelGroup,
  useGroup,
  useMarkGroupReady,
  useSetContentSent,
  useUpdateGroup,
} from '@/lib/hooks/academics/use-academics.hook';
import { GroupForm } from '../../__components/group-form';
import { StatusBadge } from '../../__components/status-badge';
import { CancelGroupDialog } from './cancel-group-dialog';
import { ReadinessPanel } from './readiness-panel';
import { StudentsCard } from './students-card';
import { TeacherCard } from './teacher-card';

export function GroupFormationScreen({ groupId }: { groupId: string }) {
  const t = useTranslations('Academics');
  const { data: group, isLoading } = useGroup(groupId);
  const { data: user } = useAuthUser();
  const updateGroup = useUpdateGroup();
  const markReady = useMarkGroupReady();
  const cancelGroup = useCancelGroup();
  const setContentSent = useSetContentSent();

  if (isLoading || !group) return <p className="p-4">{t('loading')}</p>;
  const { locked, paymentLocked } = groupScreenAccess(user, group.status);

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{group.name}</h1>
          <StatusBadge status={group.status} />
        </div>
        {locked ? null : (
          <CancelGroupDialog
            pending={cancelGroup.isPending}
            onConfirm={(reason) => cancelGroup.mutate({ id: group._id, reason })}
          />
        )}
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
                  meetingLink: group.meetingLink ?? null,
                  whatsappGroupLink: group.whatsappGroupLink ?? null,
                }}
                submitLabel={t('save')}
                pending={updateGroup.isPending || locked}
                onSubmit={(data) => updateGroup.mutate({ id: group._id, data })}
              />
            </CardContent>
          </Card>
          <StudentsCard group={group} disabled={locked} paymentDisabled={paymentLocked} />
        </div>
        <div className="space-y-6">
          <ReadinessPanel
            readiness={group.readiness}
            status={group.status}
            contentSent={group.contentSent.done}
            disabled={locked || markReady.isPending}
            onToggleContentSent={(done) => setContentSent.mutate({ id: group._id, done })}
            onMarkReady={() => markReady.mutate(group._id)}
          />
          <TeacherCard group={group} disabled={locked} />
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
