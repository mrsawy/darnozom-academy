'use client';

import { useTranslations } from 'next-intl';
import DashboardImage from '../__components/dashboard-image';
import HeroActionButtons from '../__components/hero-action-buttons';
import { getHeroAudience } from '../__components/get-hero-audience';
import { Badge } from '@/components/atoms/badge';
import { Typography } from '@/components/atoms/typography';
import { SparklesText } from '@/components/atoms/sparkles-text';
import { TextAnimate } from '@/components/atoms/text-animate';
import useUserStore from '@/lib/store/userStore';

function HeroWithDashboard() {
  const t = useTranslations('Hero');
  const user = useUserStore((state) => state.user);
  const trimmedFirstName = user?.firstName?.trim();
  const displayName =
    trimmedFirstName && trimmedFirstName.length > 0 ? trimmedFirstName : user?.username;
  const audience = user ? getHeroAudience(user.roleName) : null;

  return (
    <section
      id="home"
      className="relative container overflow-hidden pt-[50px] max-sm:w-11/12 md:pt-[90px] lg:pt-[100px]">
      <div className="container">
        <div className="-mx-4 flex flex-wrap items-center">
          <div className="w-full px-4">
            <div className="hero-content wow fadeInUp mx-auto text-center" data-wow-delay=".2s">
              <Badge
                variant="default"
                className="from-primary/30 to-primary/10 text-primary mb-6 rounded-full border-none bg-gradient-to-r px-9 py-2 font-bold">
                <div className="from-primary/40 to-primary/50 hover:bg-primary me-3 size-2 rounded-full bg-gradient-to-r" />
                {audience ? t(`welcome.${audience}.badge`) : t('numberOneMultiTenantSolution')}
              </Badge>
              <SparklesText className="gradient-text mt--10 mb-6 text-3xl leading-snug font-bold sm:my-12 sm:text-4xl sm:leading-snug lg:text-8xl lg:leading-[1.2]">
                <TextAnimate animation="blurInUp" by="word" once as="h1">
                  {audience && displayName
                    ? t(`welcome.${audience}.title`, { name: displayName })
                    : t('title')}
                </TextAnimate>
              </SparklesText>
              <Typography
                variant="p"
                size="base"
                weight="medium"
                className="mx-auto mb-9 max-w-[600px] text-center! sm:text-lg sm:leading-[1.44]">
                {audience ? t(`welcome.${audience}.description`) : t('description')}
              </Typography>
              <div className="mx-auto max-w-[790px]">
                <HeroActionButtons />
              </div>
            </div>
          </div>

          <DashboardImage />
        </div>
      </div>
    </section>
  );
}

export default HeroWithDashboard;
