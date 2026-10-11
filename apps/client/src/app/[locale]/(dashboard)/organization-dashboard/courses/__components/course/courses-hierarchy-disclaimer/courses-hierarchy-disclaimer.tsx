'use client';

import { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import { Roles } from '@darnozom/shared-types';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/atoms/alert';
import { Button } from '@/components/atoms/button';
import DisclaimerModal from '@/components/organs/disclaimer-modal/disclaimer-modal';
import useUserStore from '@/lib/store/userStore';
import { useAuthUser } from '@/lib/hooks/user/use-user.hook';
import { DISCLAIMER_IDS } from '@/lib/utils/disclaimers/disclaimer-storage';
import { CoursesHierarchyIllustration } from './courses-hierarchy-illustration';

function shouldDeferForOrgTour(roleName?: Roles, organizationOnboarded?: boolean) {
  return roleName === Roles.SUPER_ADMIN && organizationOnboarded === false;
}

export function CoursesHierarchyDisclaimer() {
  const t = useTranslations('CoursesHierarchyDisclaimer');
  const storeUser = useUserStore((state) => state.user);
  const { data: authUser } = useAuthUser();
  const user = storeUser ?? authUser ?? undefined;

  const [helpOpen, setHelpOpen] = useState(false);
  const deferAutoOpen = !user || shouldDeferForOrgTour(user.roleName, user.organizationOnboarded);

  return (
    <div className="mb-4 space-y-3">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="size-4" />
        <AlertTitle className="flex flex-wrap items-center justify-between gap-2 pr-2">
          <span>{t('bannerTitle')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setHelpOpen(true)}>
            <HelpCircle className="size-3.5" />
            {t('learnMore')}
          </Button>
        </AlertTitle>
        <AlertDescription className="mt-3 space-y-3">
          <p>{t('bannerDescription')}</p>
          <CoursesHierarchyIllustration compact />
        </AlertDescription>
      </Alert>

      <DisclaimerModal
        disclaimerId={DISCLAIMER_IDS.COURSES_HIERARCHY}
        userId={user?._id}
        deferAutoOpen={deferAutoOpen}
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title={t('modalTitle')}
        description={t('modalDescription')}
        confirmLabel={t('gotIt')}>
        <CoursesHierarchyIllustration />
        <ul className="text-muted-foreground list-disc space-y-1.5 ps-5 text-sm">
          <li>{t('tips.teacher')}</li>
          <li>{t('tips.course')}</li>
          <li>{t('tips.module')}</li>
          <li>{t('tips.content')}</li>
        </ul>
      </DisclaimerModal>
    </div>
  );
}

export default CoursesHierarchyDisclaimer;
