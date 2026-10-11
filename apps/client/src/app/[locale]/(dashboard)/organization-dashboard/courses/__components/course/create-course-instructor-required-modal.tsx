'use client';

import { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Roles } from '@darnozom/shared-types';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import DisclaimerModal from '@/components/organs/disclaimer-modal/disclaimer-modal';
import { useUsersByOrganization } from '@/lib/hooks/user/use-user.hook';
import { DISCLAIMER_IDS } from '@/lib/utils/disclaimers/disclaimer-storage';
import { ROUTE_ORG_COURSES, ROUTE_ORG_USERS_CREATE } from '@/lib/data/constants/routes.constants';
import { withDefaults } from '@/lib/types/Paginated';

/**
 * Blocks course creation until the organization has at least one Instructor user.
 */
export function CreateCourseInstructorRequiredModal() {
  const t = useTranslations('CreateCourseInstructorRequired');
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const instructorsQuery = useUsersByOrganization(withDefaults({ page: 1, limit: 1 }), {
    roleName: Roles.INSTRUCTOR,
  });

  const hasInstructor = (instructorsQuery.data?.totalDocs ?? 0) >= 1;
  const shouldAdvise = !instructorsQuery.isLoading && !instructorsQuery.isError && !hasInstructor;

  useEffect(() => {
    setOpen(shouldAdvise);
  }, [shouldAdvise]);

  return (
    <DisclaimerModal
      disclaimerId={DISCLAIMER_IDS.CREATE_COURSE_NEEDS_INSTRUCTOR}
      persistSeen={false}
      preventDismiss
      open={open}
      onOpenChange={setOpen}
      title={t('title')}
      description={t('description')}
      actions={[
        {
          label: t('backToCourses'),
          variant: 'outline',
          onClick: () => router.push(ROUTE_ORG_COURSES),
        },
        {
          label: t('createInstructor'),
          onClick: () => router.push(ROUTE_ORG_USERS_CREATE),
        },
      ]}>
      <div className="bg-primary/5 border-primary/20 flex items-start gap-3 rounded-xl border p-4 text-sm">
        <UserPlus className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
        <p className="text-muted-foreground leading-relaxed">{t('hint')}</p>
      </div>
    </DisclaimerModal>
  );
}

export default CreateCourseInstructorRequiredModal;
