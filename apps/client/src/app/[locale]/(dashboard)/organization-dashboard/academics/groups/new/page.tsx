'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ROUTE_ORG_ACADEMICS_GROUP } from '@/lib/data/constants/routes.constants';
import { useCreateGroup } from '@/lib/hooks/academics/use-academics.hook';
import { GroupForm } from '../__components/group-form';

export default function NewGroupPage() {
  const t = useTranslations('Academics');
  const router = useRouter();
  const cohortId = useSearchParams().get('cohortId');
  const createGroup = useCreateGroup();

  if (!cohortId) return <p className="p-4">{t('form.missingCohort')}</p>;

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t('groups.new')}</h1>
      <GroupForm
        initial={{
          name: '',
          schedule: [{ dayOfWeek: 0, startTime: '17:00', durationMinutes: 60 }],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          minStudents: 1,
          maxStudents: 10,
          totalSessions: 12,
          meetingLink: null,
          whatsappGroupLink: null,
        }}
        submitLabel={t('create')}
        pending={createGroup.isPending}
        onSubmit={(values) =>
          createGroup.mutate(
            { ...values, cohortId },
            { onSuccess: (group) => router.push(ROUTE_ORG_ACADEMICS_GROUP(group._id)) }
          )
        }
      />
    </div>
  );
}
