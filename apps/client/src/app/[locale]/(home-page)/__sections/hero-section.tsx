'use client';

import { useTranslations } from 'next-intl';
import DisplayHeading from '@/components/molecules/public-site/display-heading';
import StatFigure from '@/components/molecules/public-site/stat-figure';
import useUserStore from '@/lib/store/userStore';
import { ANCHOR_HOME_TOP } from '@/lib/data/constants/routes.constants';
import HeroActionButtons from '../__components/hero-action-buttons';
import HeroDashboardPreview from '../__components/hero-dashboard-preview';
import { getHeroAudience } from '../__components/get-hero-audience';

const HERO_STAT_INDEXES = [0, 1, 2] as const;

function HeroSection() {
  const t = useTranslations('Hero');
  const tAudience = useTranslations('AudienceSection');
  const user = useUserStore((state) => state.user);

  const trimmedFirstName = user?.firstName?.trim();
  const displayName = trimmedFirstName || user?.username;
  const audience = user ? getHeroAudience(user.roleName) : null;

  const badge = audience ? t(`welcome.${audience}.badge`) : t('numberOneMultiTenantSolution');
  const title =
    audience && displayName ? t(`welcome.${audience}.title`, { name: displayName }) : t('title');
  const description = audience ? t(`welcome.${audience}.description`) : t('description');

  return (
    <section
      id={ANCHOR_HOME_TOP.slice(1)}
      className="bg-dz-paper text-dz-ink mx-auto grid w-full max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] items-center gap-14 px-6 pt-18 pb-14">
      <div className="flex flex-col gap-6">
        <span className="bg-dz-sand text-dz-terracotta self-start rounded-full px-3.5 py-1.5 text-[13px] font-semibold">
          {badge}
        </span>

        <DisplayHeading as="h1" scale="hero">
          {title}
        </DisplayHeading>

        <p className="text-dz-ink-soft m-0 max-w-[540px] text-lg text-pretty">{description}</p>

        <HeroActionButtons />

        <div className="border-dz-line mt-2 flex flex-wrap gap-8 border-t pt-3.5">
          {HERO_STAT_INDEXES.map((index) => (
            <StatFigure
              key={index}
              value={tAudience(`highlights.${index}.value`)}
              label={tAudience(`highlights.${index}.label`)}
            />
          ))}
        </div>
      </div>

      <HeroDashboardPreview />
    </section>
  );
}

export default HeroSection;
