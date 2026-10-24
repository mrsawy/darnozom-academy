'use client';

import { useTranslations } from 'next-intl';
import CtaLink from '@/components/molecules/public-site/cta-link';
import useUserStore from '@/lib/store/userStore';
import { getDashboardUrl } from '@/lib/utils/routes/getDashboardUrl';
import {
  ANCHOR_HOME_PRICING,
  ANCHOR_HOME_STUDENT_APP,
} from '@/lib/data/constants/routes.constants';
import { getHeroAudience } from './get-hero-audience';

function HeroActionButtons() {
  const t = useTranslations('Hero');
  const user = useUserStore((state) => state.user);

  // Signed-in visitors get one unambiguous action instead of the acquisition pair.
  if (user) {
    const audience = getHeroAudience(user.roleName);

    return (
      <div className="flex flex-wrap gap-3">
        <CtaLink href={getDashboardUrl(user.roleName)} variant="terracotta">
          {t(`welcome.${audience}.goToDashboard`)}
        </CtaLink>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <CtaLink href={ANCHOR_HOME_PRICING} variant="terracotta">
        {t('startFreeTrial')}
      </CtaLink>
      <CtaLink href={ANCHOR_HOME_STUDENT_APP} variant="outline">
        {t('downloadStudentsApplicationNow')}
      </CtaLink>
    </div>
  );
}

export default HeroActionButtons;
